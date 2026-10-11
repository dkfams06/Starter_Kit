import { Prisma } from "@/generated/prisma/client";
import { HttpError } from "@/lib/http-error";
import { quantitySchema } from "./order-validation";
import { unitPriceSchema } from "./master-validation";

export function calculateAmounts(items: { quantity: string; unitPrice: string }[]) {
  const lines = items.map(i => new Prisma.Decimal(quantitySchema.parse(i.quantity)).mul(unitPriceSchema.parse(i.unitPrice)).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP));
  const total = lines.reduce((sum, line) => sum.plus(line), new Prisma.Decimal(0));
  if (total.gt("99999999999999.99")) throw new HttpError("주문 합계가 허용 범위를 초과했습니다.", 400, "AMOUNT_OVERFLOW");
  return { lines, total };
}
