import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/auth/audit";
import { HttpError } from "@/lib/http-error";
import { assertMasterAccess } from "./master-policy";
import { lockBusinessWrite } from "./business-lock";
import { customerSchema, updateCustomerSchema, deleteMasterSchema, masterQuerySchema } from "./master-validation";

export async function listCustomers(actor: CurrentUser, query: unknown = {}) {
  assertMasterAccess(actor);
  const { q, active, page } = masterQuerySchema.parse(query);
  const where: Prisma.CustomerWhereInput = {
    ...(active === "all" ? {} : { isActive: active === "true" }),
    ...(q ? { OR: [{ code: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.customer.findMany({ where, orderBy: [{ name: "asc" }, { id: "asc" }], take: 20, skip: (page - 1) * 20 }),
    prisma.customer.count({ where }),
  ]);
  return { items, total, page, pageSize: 20 };
}

export async function getCustomer(actor: CurrentUser, id: string) {
  assertMasterAccess(actor);
  const item = await prisma.customer.findUnique({ where: { id } });
  if (!item) throw new HttpError("거래처를 찾을 수 없습니다.", 404, "NOT_FOUND");
  return item;
}

export async function createCustomer(actor: CurrentUser, input: unknown) {
  assertMasterAccess(actor, true);
  const data = customerSchema.parse(input);
  return prisma.$transaction(async tx => {
    await lockBusinessWrite(tx);
    const item = await tx.customer.create({ data });
    await writeAuditLog({ actorId: actor.id, action: "CUSTOMER_CREATED", targetType: "Customer", targetId: item.id, metadata: { code: item.code } }, tx);
    return item;
  });
}

export async function updateCustomer(actor: CurrentUser, id: string, input: unknown) {
  assertMasterAccess(actor, true);
  const data = updateCustomerSchema.parse(input);
  return prisma.$transaction(async tx => {
    await lockBusinessWrite(tx);
    const previous = await tx.customer.findUniqueOrThrow({ where: { id } });
    const item = await tx.customer.update({ where: { id }, data });
    await writeAuditLog({
      actorId: actor.id, action: previous.isActive && !item.isActive ? "CUSTOMER_DEACTIVATED" : "CUSTOMER_UPDATED",
      targetType: "Customer", targetId: id,
      metadata: { code: item.code, changedFields: Object.keys(data), isActive: item.isActive },
    }, tx);
    return item;
  }, { isolationLevel: "Serializable" });
}

export async function deleteCustomer(actor: CurrentUser, id: string, input: unknown) {
  assertMasterAccess(actor, true);
  const { reason } = deleteMasterSchema.parse(input);
  return prisma.$transaction(async tx => {
    await lockBusinessWrite(tx);
    const item = await tx.customer.findUniqueOrThrow({ where: { id } });
    if (item.hasOrderHistory) throw new HttpError("주문 사용 이력이 있어 삭제할 수 없습니다. 비활성화해 주세요.", 409, "USED_MASTER");
    await tx.customer.delete({ where: { id } });
    await writeAuditLog({ actorId: actor.id, action: "CUSTOMER_DELETED", targetType: "Customer", targetId: id, metadata: { code: item.code, reason } }, tx);
  }, { isolationLevel: "Serializable" });
}
