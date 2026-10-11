import type { Prisma } from "../../src/generated/prisma/client";
import { seoulDate } from "../../src/modules/order-shipping/order-validation";

export async function seedDemoBusiness(tx: Prisma.TransactionClient) {
  const customerCode = "DEMO-C-001", productCode = "DEMO-P-001";
  let customer = await tx.customer.findUnique({ where: { code: customerCode } });
  if (!customer) {
    customer = await tx.customer.create({ data: { code: customerCode, name: "(가상) 데모 거래처 001", defaultAddress: "가상 배송지 · 실제 주소 아님", memo: "포트폴리오 가상 데이터" } });
    await tx.auditLog.create({ data: { action: "CUSTOMER_CREATED", targetType: "Customer", targetId: customer.id, metadata: { source: "demo-seed", code: customerCode } } });
  }
  let product = await tx.product.findUnique({ where: { code: productCode } });
  if (!product) {
    product = await tx.product.create({ data: { code: productCode, name: "샘플 포장 박스", unit: "BOX", defaultUnitPrice: "1250.00" } });
    await tx.auditLog.create({ data: { action: "PRODUCT_CREATED", targetType: "Product", targetId: product.id, metadata: { source: "demo-seed", code: productCode } } });
  }
  if (!customer.isActive || !product.isActive) throw new Error("Demo master records must be active.");
  for (const status of ["RECEIVED", "CONFIRMED", "SHIPPED"] as const) {
    const id = `demo-order-${status.toLowerCase()}-v1`;
    if (await tx.customerOrder.findUnique({ where: { id } })) continue;
    const now = new Date(), date = seoulDate(now);
    const counter = await tx.orderNumberCounter.upsert({ where: { date: new Date(date) }, create: { date: new Date(date), lastValue: 1 }, update: { lastValue: { increment: 1 } } });
    const orderNo = `ORD-${date.replaceAll("-", "")}-${String(counter.lastValue).padStart(4, "0")}`;
    await tx.customerOrder.create({ data: {
      id, orderNo, status, customerId: customer.id, customerCodeSnapshot: customer.code, customerNameSnapshot: customer.name,
      shippingAddress: "가상 배송지 · 실제 주소 아님", totalAmount: "2500.00", memo: "포트폴리오 가상 주문", orderedAt: now,
      ...(status !== "RECEIVED" ? { firstConfirmedAt: now, confirmedAt: now } : {}),
      items: { create: { lineNo: 1, productId: product.id, productCodeSnapshot: product.code, productNameSnapshot: product.name, unitSnapshot: product.unit, quantity: "2", unitPrice: "1250.00", lineAmount: "2500.00" } },
      ...(status === "SHIPPED" ? { shipment: { create: { carrier: "가상 운송사", trackingNumber: "DEMO-NOT-REAL", shippedAt: now } } } : {}),
    } });
    await tx.customer.update({ where: { id: customer.id }, data: { hasOrderHistory: true } });
    await tx.product.update({ where: { id: product.id }, data: { hasOrderHistory: true } });
    for (const action of ["ORDER_CREATED", ...(status !== "RECEIVED" ? ["ORDER_CONFIRMED"] : []), ...(status === "SHIPPED" ? ["ORDER_SHIPPED"] : [])] as const) {
      await tx.auditLog.create({ data: { action: action as "ORDER_CREATED" | "ORDER_CONFIRMED" | "ORDER_SHIPPED", targetType: "CustomerOrder", targetId: id, metadata: { source: "demo-seed", orderNo } } });
    }
  }
}

// Caller owns the transaction, identity guard and exclusive advisory lock.
// Core User, Task, auth logs and order counters are deliberately untouched.
export async function resetDemoBusiness(tx: Prisma.TransactionClient) {
  const counts = { orders: await tx.customerOrder.count(), customers: await tx.customer.count(), products: await tx.product.count() };
  await tx.shipment.deleteMany();
  await tx.customerOrder.deleteMany();
  await tx.product.deleteMany();
  await tx.customer.deleteMany();
  await tx.auditLog.deleteMany({ where: { targetType: { in: ["Customer", "Product", "CustomerOrder", "OrderExport"] } } });
  await seedDemoBusiness(tx);
  await tx.auditLog.create({ data: { action: "DEMO_RESET", targetType: "DemoEnvironment", metadata: { source: "operator-cli", removed: counts } } });
  return counts;
}
