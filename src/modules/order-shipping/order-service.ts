import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/auth/audit";
import { HttpError } from "@/lib/http-error";
import { assertMasterAccess } from "./master-policy";
import { assertOrderAction, type OrderAction } from "./order-policy";
import { orderSchema, updateOrderSchema, actionSchema, reasonSchema, shipSchema, orderQuerySchema, seoulDate, dayStart, dayAfter } from "./order-validation";
import { calculateAmounts } from "./order-money";
import { lockBusinessWrite } from "./business-lock";

const details = {
  items: { orderBy: { lineNo: "asc" as const } },
  shipment: { include: { shippedBy: { select: { name: true } } } },
  createdBy: { select: { name: true } }, confirmedBy: { select: { name: true } },
} satisfies Prisma.CustomerOrderInclude;
export function orderWhere(query: unknown): { query: ReturnType<typeof orderQuerySchema.parse>; where: Prisma.CustomerOrderWhereInput } {
  const q = orderQuerySchema.parse(query);
  return { query: q, where: {
    ...(q.status ? { status: q.status } : {}), ...(q.customerId ? { customerId: q.customerId } : {}),
    ...(q.from || q.to ? { orderedAt: { ...(q.from ? { gte: dayStart(q.from) } : {}), ...(q.to ? { lt: dayAfter(q.to) } : {}) } } : {}),
    ...(q.q ? { OR: [{ orderNo: { contains: q.q, mode: "insensitive" } }, { customerNameSnapshot: { contains: q.q, mode: "insensitive" } }] } : {}),
  } };
}
export async function listOrders(actor: CurrentUser, input: unknown = {}) {
  assertMasterAccess(actor);
  const { query, where } = orderWhere(input);
  const [items, total] = await prisma.$transaction([
    prisma.customerOrder.findMany({ where, orderBy: [{ orderedAt: "desc" }, { id: "desc" }], take: 20, skip: (query.page - 1) * 20 }),
    prisma.customerOrder.count({ where }),
  ]);
  return { items, total, page: query.page, pageSize: 20 };
}
export async function getOrder(actor: CurrentUser, id: string) {
  assertMasterAccess(actor);
  const order = await prisma.customerOrder.findUnique({ where: { id }, include: details });
  if (!order) throw new HttpError("주문을 찾을 수 없습니다.", 404, "NOT_FOUND");
  const history = await prisma.auditLog.findMany({ where: { targetType: "CustomerOrder", targetId: id }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, action: true, createdAt: true, metadata: true, actor: { select: { name: true } } } });
  return { ...order, history };
}
export async function orderOptions(actor: CurrentUser, includeInactiveCustomers = false) {
  assertMasterAccess(actor);
  // Active master search is bounded; existing snapshots remain in the detail form.
  const [customers, products] = await Promise.all([
    prisma.customer.findMany({ where: includeInactiveCustomers ? {} : { isActive: true }, orderBy: { name: "asc" }, take: 500, select: { id: true, code: true, name: true, defaultAddress: true } }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, take: 500, select: { id: true, code: true, name: true, unit: true, defaultUnitPrice: true } }),
  ]);
  return { customers, products };
}
type Existing = Prisma.CustomerOrderGetPayload<{ include: { items: true } }>;
async function prepare(tx: Prisma.TransactionClient, input: ReturnType<typeof orderSchema.parse>, existing?: Existing) {
  // Lock in a deterministic order to serialize changes to active flags/history.
  await tx.$queryRaw`SELECT id FROM "Customer" WHERE id=${input.customerId} FOR UPDATE`;
  const customer = await tx.customer.findUnique({ where: { id: input.customerId } });
  if (!customer || (!customer.isActive && existing?.customerId !== customer.id)) throw new HttpError("활성 거래처를 선택하세요.", 400, "INVALID_CUSTOMER");
  const amounts = calculateAmounts(input.items);
  const ids = input.items.map(i => i.productId).sort();
  for (const id of ids) await tx.$queryRaw`SELECT id FROM "Product" WHERE id=${id} FOR UPDATE`;
  const products = await tx.product.findMany({ where: { id: { in: ids } } });
  const items = input.items.map((line, i) => {
    const product = products.find(p => p.id === line.productId);
    const old = existing?.items.find(p => p.productId === line.productId);
    if (!product || (!product.isActive && !old)) throw new HttpError("활성 품목을 선택하세요.", 400, "INVALID_PRODUCT");
    return { lineNo: i + 1, productId: product.id, productCodeSnapshot: old?.productCodeSnapshot ?? product.code,
      productNameSnapshot: old?.productNameSnapshot ?? product.name, specificationSnapshot: old ? old.specificationSnapshot : product.specification,
      unitSnapshot: old?.unitSnapshot ?? product.unit, quantity: line.quantity, unitPrice: line.unitPrice, lineAmount: amounts.lines[i] };
  });
  await tx.customer.update({ where: { id: customer.id }, data: { hasOrderHistory: true } });
  await tx.product.updateMany({ where: { id: { in: ids } }, data: { hasOrderHistory: true } });
  return { customerId: customer.id,
    customerCodeSnapshot: existing?.customerId === customer.id ? existing.customerCodeSnapshot : customer.code,
    customerNameSnapshot: existing?.customerId === customer.id ? existing.customerNameSnapshot : customer.name,
    shippingAddress: input.shippingAddress, memo: input.memo || null,
    requestedShipDate: input.requestedShipDate ? new Date(`${input.requestedShipDate}T00:00:00Z`) : null,
    totalAmount: amounts.total, items };
}
export async function createOrder(actor: CurrentUser, input: unknown) {
  assertMasterAccess(actor);
  const data = orderSchema.parse(input);
  return prisma.$transaction(async tx => {
    await lockBusinessWrite(tx);
    const prepared = await prepare(tx, data);
    const date = seoulDate();
    const counter = await tx.orderNumberCounter.upsert({ where: { date: new Date(date) }, create: { date: new Date(date), lastValue: 1 }, update: { lastValue: { increment: 1 } } });
    const orderNo = `ORD-${date.replaceAll("-", "")}-${String(counter.lastValue).padStart(4, "0")}`;
    const order = await tx.customerOrder.create({ data: { ...prepared, items: { create: prepared.items }, orderNo, createdById: actor.id } });
    await writeAuditLog({ actorId: actor.id, action: "ORDER_CREATED", targetType: "CustomerOrder", targetId: order.id, metadata: { orderNo, customerCode: prepared.customerCodeSnapshot } }, tx);
    return order;
  }, { timeout: 15000 });
}
async function lockedOrder(tx: Prisma.TransactionClient, id: string, version: number) {
  await lockBusinessWrite(tx);
  await tx.$queryRaw`SELECT id FROM "CustomerOrder" WHERE id=${id} FOR UPDATE`;
  const order = await tx.customerOrder.findUnique({ where: { id }, include: { items: true } });
  if (!order) throw new HttpError("주문을 찾을 수 없습니다.", 404, "NOT_FOUND");
  if (order.version !== version) throw new HttpError("다른 사용자가 변경했습니다. 새로고침 후 다시 시도하세요.", 409, "STALE_ORDER");
  return order;
}
export async function updateOrder(actor: CurrentUser, id: string, input: unknown) {
  assertMasterAccess(actor);
  const data = updateOrderSchema.parse(input);
  return prisma.$transaction(async tx => {
    const old = await lockedOrder(tx, id, data.version);
    assertOrderAction(actor, old, "update");
    const prepared = await prepare(tx, data, old);
    await tx.orderItem.deleteMany({ where: { orderId: id } });
    const result = await tx.customerOrder.update({ where: { id }, data: { ...prepared, items: { create: prepared.items }, version: { increment: 1 } } });
    await writeAuditLog({ actorId: actor.id, action: "ORDER_UPDATED", targetType: "CustomerOrder", targetId: id, metadata: { orderNo: old.orderNo, version: result.version } }, tx);
    return result;
  }, { timeout: 15000 });
}
export async function actOnOrder(actor: CurrentUser, id: string, action: Exclude<OrderAction, "update">, input: unknown) {
  assertMasterAccess(actor);
  if ((action === "delete" || action === "revert-confirmation") && actor.role !== "ADMIN") throw new HttpError("관리자 권한이 필요합니다.", 403, "FORBIDDEN");
  const data = (action === "ship" ? shipSchema : action === "confirm" ? actionSchema : reasonSchema).parse(input);
  return prisma.$transaction(async tx => {
    const old = await lockedOrder(tx, id, data.version);
    assertOrderAction(actor, old, action);
    const now = new Date();
    const reason = "reason" in data ? String(data.reason) : undefined;
    const metadata = { orderNo: old.orderNo, customerCode: old.customerCodeSnapshot, ...(reason ? { reason } : {}) };
    if (action === "delete") {
      await tx.customerOrder.delete({ where: { id } });
      await writeAuditLog({ actorId: actor.id, action: "ORDER_DELETED", targetType: "CustomerOrder", targetId: id, metadata }, tx);
      return null;
    }
    const patch: Prisma.CustomerOrderUpdateInput = { version: { increment: 1 } };
    if (action === "confirm") Object.assign(patch, { status: "CONFIRMED", firstConfirmedAt: old.firstConfirmedAt ?? now, confirmedAt: now, confirmedBy: { connect: { id: actor.id } } });
    if (action === "revert-confirmation") Object.assign(patch, { status: "RECEIVED", confirmedAt: null, confirmedBy: { disconnect: true } });
    if (action === "cancel") Object.assign(patch, { status: "CANCELLED", cancelledAt: now, cancelReason: reason, cancelledBy: { connect: { id: actor.id } } });
    if (action === "ship") {
      const shipping = shipSchema.parse(input);
      await tx.shipment.create({ data: { orderId: id, shippedById: actor.id, shippedAt: now, carrier: shipping.carrier || null, trackingNumber: shipping.trackingNumber || null, memo: shipping.memo || null } });
      patch.status = "SHIPPED";
    }
    const result = await tx.customerOrder.update({ where: { id }, data: patch });
    const auditAction = { confirm: "ORDER_CONFIRMED", "revert-confirmation": "ORDER_CONFIRMATION_REVERTED", cancel: "ORDER_CANCELLED", ship: "ORDER_SHIPPED" } as const;
    await writeAuditLog({ actorId: actor.id, action: auditAction[action], targetType: "CustomerOrder", targetId: id, metadata }, tx);
    return result;
  }, { timeout: 15000 });
}

export async function operationsDashboard(actor: CurrentUser) {
  assertMasterAccess(actor);
  const date = seoulDate();
  const today = { gte: dayStart(date), lt: dayAfter(date) };
  const [receivedToday, waitingConfirmation, waitingShipment, shippedToday, recent] = await prisma.$transaction([
    prisma.customerOrder.count({ where: { orderedAt: today } }),
    prisma.customerOrder.count({ where: { status: "RECEIVED" } }),
    prisma.customerOrder.count({ where: { status: "CONFIRMED" } }),
    prisma.shipment.count({ where: { shippedAt: today } }),
    prisma.auditLog.findMany({ where: { targetType: "CustomerOrder" }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, action: true, createdAt: true, metadata: true, actor: { select: { name: true } } } }),
  ]);
  return { receivedToday, waitingConfirmation, waitingShipment, shippedToday, recent };
}
