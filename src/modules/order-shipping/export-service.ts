import "server-only";
import type { CurrentUser } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/http-error";
import { writeAuditLog } from "@/lib/auth/audit";
import { assertMasterAccess } from "./master-policy";
import { orderWhere } from "./order-service";
import { buildOrderWorkbook, type ExportCell } from "./order-workbook";
import { statusLabels, seoulDate } from "./order-validation";

export const MAX_EXPORT_ROWS = 5000;
export async function exportOrders(actor: CurrentUser, input: unknown) {
  assertMasterAccess(actor);
  const { where, query } = orderWhere(input);
  const lines = await prisma.orderItem.findMany({
    where: { order: where }, take: MAX_EXPORT_ROWS + 1,
    orderBy: [{ order: { orderedAt: "desc" } }, { orderId: "asc" }, { lineNo: "asc" }],
    include: { order: { include: { createdBy: { select: { name: true } }, confirmedBy: { select: { name: true } }, shipment: { include: { shippedBy: { select: { name: true } } } } } } },
  });
  if (lines.length > MAX_EXPORT_ROWS) throw new HttpError("Excel은 최대 5,000행입니다. 검색 기간을 줄여 주세요.", 400, "EXPORT_LIMIT");
  const rows: ExportCell[][] = lines.map(line => {
    const o = line.order, s = o.shipment;
    return [o.orderNo, statusLabels[o.status], new Date(seoulDate(o.orderedAt)), o.customerCodeSnapshot, o.customerNameSnapshot,
      line.productCodeSnapshot, line.productNameSnapshot, line.specificationSnapshot, line.unitSnapshot,
      line.quantity.toNumber(), line.unitPrice.toNumber(), line.lineAmount.toNumber(), o.requestedShipDate,
      s ? new Date(seoulDate(s.shippedAt)) : null, s?.carrier ?? null, s?.trackingNumber ?? null,
      o.createdBy?.name ?? "삭제된 사용자", o.confirmedBy?.name ?? null, s?.shippedBy?.name ?? null];
  });
  const bytes = await buildOrderWorkbook(rows);
  await writeAuditLog({ actorId: actor.id, action: "ORDER_EXPORTED", targetType: "OrderExport", targetId: query.customerId || null, metadata: { rowCount: rows.length } });
  return bytes;
}
