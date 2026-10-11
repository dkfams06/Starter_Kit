import { z } from "zod";

const code = z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/, "코드는 영문·숫자·밑줄·하이픈만 사용하세요.").transform(v => v.toUpperCase());
const name = z.string().trim().min(1).max(120);
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional().transform(v => v || null);

export const customerSchema = z.object({
  code, name,
  businessNumber: optionalText(30), contactName: optionalText(100), phone: optionalText(40),
  email: z.union([z.string().trim().email().max(254), z.literal(""), z.null()]).optional().transform(v => v?.toLowerCase() || null),
  defaultAddress: optionalText(500), memo: optionalText(2000),
}).strict();

// Accept decimal strings only: no floating-point rounding, exponent syntax or overflow.
export const unitPriceSchema = z.string().trim().regex(/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/, "단가는 0 이상, 정수 12자리·소수 2자리 이하로 입력하세요.");
export const productSchema = z.object({
  code, name, specification: optionalText(200),
  unit: z.string().trim().min(1).max(20),
  defaultUnitPrice: z.union([unitPriceSchema, z.literal(""), z.null()]).optional().transform(v => v || null),
  memo: optionalText(2000),
}).strict();

export const updateCustomerSchema = customerSchema.partial().extend({ isActive: z.boolean().optional() }).strict().refine(v => Object.keys(v).length > 0);
export const updateProductSchema = productSchema.partial().extend({ isActive: z.boolean().optional() }).strict().refine(v => Object.keys(v).length > 0);
export const deleteMasterSchema = z.object({ reason: z.string().trim().min(1, "삭제 사유를 입력하세요.").max(500) }).strict();
export const masterQuerySchema = z.object({
  q: z.string().trim().max(120).default(""),
  active: z.enum(["all", "true", "false"]).default("all"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
}).strict();
