import { test } from "node:test";
import assert from "node:assert/strict";
import { customerSchema, productSchema, unitPriceSchema, updateCustomerSchema, deleteMasterSchema, masterQuerySchema } from "./master-validation";
import { assertMasterAccess } from "./master-policy";
import type { CurrentUser } from "@/lib/auth/authorization";

test("master data writes require an active administrator", () => {
  const user: CurrentUser = { id: "test", name: null, email: "test@example.com", role: "USER", isActive: true };
  assert.doesNotThrow(() => assertMasterAccess(user));
  assert.throws(() => assertMasterAccess(user, true));
  assert.doesNotThrow(() => assertMasterAccess({ ...user, role: "ADMIN" }, true));
  assert.throws(() => assertMasterAccess({ ...user, isActive: false } as unknown as CurrentUser));
});
test("codes normalize, invalid fields and blank updates are rejected", () => {
  assert.equal(customerSchema.parse({ code: " c-01 ", name: "거래처" }).code, "C-01");
  assert.equal(customerSchema.safeParse({ code: "c", name: " " }).success, false);
  assert.equal(customerSchema.safeParse({ code: "c", name: "name", role: "ADMIN" }).success, false);
  assert.equal(customerSchema.safeParse({ code: "c", name: "name", email: "bad" }).success, false);
  assert.equal(updateCustomerSchema.safeParse({}).success, false);
  assert.deepEqual(updateCustomerSchema.parse({ isActive: false }), { isActive: false });
  assert.equal(deleteMasterSchema.safeParse({ reason: " " }).success, false);
});
test("prices retain decimal precision and reject overflow, negatives, exponent and fractions beyond cents", () => {
  assert.equal(unitPriceSchema.parse("999999999999.99"), "999999999999.99");
  assert.equal(unitPriceSchema.parse("0.10"), "0.10");
  for (const value of ["-1", "1e3", "1.001", "1000000000000", "NaN", "Infinity", 0.1]) assert.equal(unitPriceSchema.safeParse(value).success, false);
  assert.equal(productSchema.parse({ code: "p", name: "product", unit: "EA", defaultUnitPrice: "" }).defaultUnitPrice, null);
});
test("search pagination and active filters are bounded", () => {
  assert.equal(masterQuerySchema.safeParse({ page: -1 }).success, false);
  assert.equal(masterQuerySchema.safeParse({ active: "anything" }).success, false);
  assert.equal(masterQuerySchema.parse({ page: "2", active: "false" }).page, 2);
});
