import { z } from "zod";
import { unitPriceSchema } from "./master-validation";

export const statuses = ["RECEIVED", "CONFIRMED", "SHIPPED", "CANCELLED"] as const;
export const statusLabels = { RECEIVED: "접수", CONFIRMED: "확인", SHIPPED: "출고 완료", CANCELLED: "취소" };
export const idSchema = z.string().trim().min(1).max(100);
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
}, "올바른 날짜를 입력하세요.");
export const quantitySchema = z.string().trim().regex(/^(0|[1-9]\d{0,10})(\.\d{1,3})?$/).refine(v => /[1-9]/.test(v), "수량은 0보다 커야 합니다.");
export const orderSchema = z.object({
  customerId: idSchema,
  shippingAddress: z.string().trim().min(1).max(500),
  requestedShipDate: z.union([dateSchema, z.literal(""), z.null()]).optional().transform(v => v || null),
  memo: z.string().trim().max(2000).optional().default(""),
  items: z.array(z.object({ productId: idSchema, quantity: quantitySchema, unitPrice: unitPriceSchema }).strict()).min(1).max(50),
}).strict().refine(v => new Set(v.items.map(i => i.productId)).size === v.items.length, "같은 품목은 한 행으로 입력하세요.");
export const versionSchema = z.number().int().positive();
export const updateOrderSchema = orderSchema.safeExtend({ version: versionSchema });
export const actionSchema = z.object({ version: versionSchema }).strict();
export const reasonSchema = actionSchema.extend({ reason: z.string().trim().min(1).max(500) }).strict();
export const shipSchema = actionSchema.extend({
  carrier: z.string().trim().max(100).optional().default(""),
  trackingNumber: z.string().trim().max(100).optional().default(""),
  memo: z.string().trim().max(1000).optional().default(""),
}).strict();
export const orderQuerySchema = z.object({
  q: z.string().trim().max(120).default(""),
  customerId: z.union([idSchema, z.literal("")]).default(""),
  status: z.union([z.enum(statuses), z.literal("")]).default(""),
  from: z.union([dateSchema, z.literal("")]).default(""),
  to: z.union([dateSchema, z.literal("")]).default(""),
  page: z.coerce.number().int().min(1).max(10000).default(1),
}).strict().refine(v => !v.from || !v.to || v.from <= v.to, "기간을 확인하세요.");

export function seoulDate(now = new Date()) {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
export function dayStart(date: string) { return new Date(`${date}T00:00:00+09:00`); }
export function dayAfter(date: string) { return new Date(dayStart(date).getTime() + 86400000); }
