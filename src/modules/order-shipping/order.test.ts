import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import type { CurrentUser } from "@/lib/auth/authorization";
import { assertOrderAction, type OrderAction } from "./order-policy";
import { calculateAmounts } from "./order-money";
import { orderSchema, updateOrderSchema, orderQuerySchema, reasonSchema, quantitySchema, seoulDate, dayStart, dayAfter } from "./order-validation";
import { buildOrderWorkbook, safeExcelText } from "./order-workbook";
import { assertDemoDatabase } from "./demo-policy";
import { previewTotal } from "./components/order-types";

const user: CurrentUser = { id: "unit-user", name: null, email: "unit@example.invalid", role: "USER", isActive: true };
const admin: CurrentUser = { ...user, role: "ADMIN" };
test("strict order state and role matrix", () => {
  for (const actor of [user, admin]) {
    for (const status of ["RECEIVED", "CONFIRMED", "SHIPPED", "CANCELLED"] as const) {
      for (const action of ["update", "confirm", "ship", "cancel", "revert-confirmation", "delete"] as OrderAction[]) {
        const allowed = status === "RECEIVED" ? ["update", "confirm", "cancel", ...(actor.role === "ADMIN" ? ["delete"] : [])]
          : status === "CONFIRMED" ? ["ship", ...(actor.role === "ADMIN" ? ["cancel", "revert-confirmation"] : [])] : [];
        const run = () => assertOrderAction(actor, { status, firstConfirmedAt: null }, action);
        if (allowed.includes(action)) assert.doesNotThrow(run); else assert.throws(run);
      }
    }
  }
  assert.throws(() => assertOrderAction(admin, { status: "RECEIVED", firstConfirmedAt: new Date() }, "delete"));
  assert.throws(() => assertOrderAction({ ...user, isActive: false } as unknown as CurrentUser, { status: "RECEIVED", firstConfirmedAt: null }, "confirm"));
});
test("decimal amounts round each line HALF_UP, match UI and reject overflow", () => {
  const input = [{ quantity: "0.005", unitPrice: "1" }, { quantity: "2.125", unitPrice: "12.34" }];
  const amounts = calculateAmounts(input);
  assert.deepEqual(amounts.lines.map(x => x.toFixed(2)), ["0.01", "26.22"]);
  assert.equal(amounts.total.toFixed(2), "26.23");
  assert.equal(previewTotal(input), "26.23");
  assert.throws(() => calculateAmounts([{ quantity: "99999999999.999", unitPrice: "999999999999.99" }]));
  for (const q of ["0", "0.000", "-1", "1.0001", "1e3", "Infinity", "100000000000"]) assert.equal(quantitySchema.safeParse(q).success, false);
});
test("order input rejects injected status/total, duplicates, bad dates and missing version/reason", () => {
  const input = { customerId: "customer", shippingAddress: "fake", items: [{ productId: "product", quantity: "1", unitPrice: "0" }] };
  assert.equal(orderSchema.safeParse(input).success, true);
  assert.equal(orderSchema.safeParse({ ...input, totalAmount: "0" }).success, false);
  assert.equal(orderSchema.safeParse({ ...input, status: "SHIPPED" }).success, false);
  assert.equal(orderSchema.safeParse({ ...input, items: [...input.items, ...input.items] }).success, false);
  assert.equal(orderSchema.safeParse({ ...input, requestedShipDate: "2026-02-30" }).success, false);
  assert.equal(updateOrderSchema.safeParse(input).success, false);
  assert.equal(updateOrderSchema.safeParse({ ...input, version: 1 }).success, true);
  assert.equal(reasonSchema.safeParse({ version: 1, reason: " " }).success, false);
  assert.equal(orderQuerySchema.safeParse({ from: "2026-10-12", to: "2026-10-11" }).success, false);
});
test("Seoul day boundaries do not use server timezone", () => {
  assert.equal(seoulDate(new Date("2026-10-10T15:00:00Z")), "2026-10-11");
  assert.equal(dayStart("2026-10-11").toISOString(), "2026-10-10T15:00:00.000Z");
  assert.equal(dayAfter("2026-10-11").toISOString(), "2026-10-11T15:00:00.000Z");
});
test("Excel is a valid xlsx with numeric/date cells and escaped formulas", async () => {
  const bytes = await buildOrderWorkbook([["=1+1", "접수", new Date("2026-10-11"), "code", "@fake", "p", "name", null, "EA", 1.125, 10, 11.25, null, null, null, null, null, null, null]]);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  const sheet = workbook.worksheets[0];
  assert.equal(sheet.getCell("A2").value, "'=1+1");
  assert.equal(sheet.getCell("E2").type, ExcelJS.ValueType.String);
  assert.equal(sheet.getCell("J2").value, 1.125);
  assert.ok(sheet.getCell("C2").value instanceof Date);
  assert.equal(sheet.getCell("L2").numFmt, "#,##0.00");
  assert.equal(safeExcelText(" \t+SUM(A1)"), "' \t+SUM(A1)");
});
test("demo reset fails closed on missing flags, host/name mismatch and absent confirmation", () => {
  const env = { DEMO_MODE: "true", DEMO_DATABASE_NAME: "test_demo", DEMO_DATABASE_HOST: "127.0.0.1", DATABASE_URL: "postgresql://127.0.0.1/test_demo", DEMO_RESET_CONFIRM: "RESET:test_demo" };
  assert.doesNotThrow(() => assertDemoDatabase(env, "test_demo", true));
  assert.throws(() => assertDemoDatabase({ ...env, DEMO_MODE: "false" }, "test_demo", true));
  assert.throws(() => assertDemoDatabase({ ...env, DEMO_RESET_CONFIRM: "" }, "test_demo", true));
  assert.throws(() => assertDemoDatabase({ ...env, DEMO_DATABASE_HOST: "production" }, "test_demo", true));
  assert.throws(() => assertDemoDatabase(env, "production", true));
  assert.throws(() => assertDemoDatabase({}, "test_demo"));
});
