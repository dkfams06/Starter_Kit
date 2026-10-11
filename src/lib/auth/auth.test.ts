import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, verifyPassword } from "./password";
import { assertAdmin } from "./rbac";
import { createUserSchema, signInSchema } from "./validation";

test("passwords are hashed and verified without storing plaintext", async () => {
  const password = "Strong-password-123!";
  const hash = await hashPassword(password);

  assert.notEqual(hash, password);
  assert.equal(await verifyPassword(hash, password), true);
  assert.equal(await verifyPassword(hash, "Wrong-password-123!"), false);
});

test("credential input normalizes email and rejects missing password", () => {
  const valid = signInSchema.parse({
    email: " Admin@Example.COM ",
    password: "value",
  });
  assert.equal(valid.email, "admin@example.com");
  assert.equal(signInSchema.safeParse({ email: "invalid", password: "" }).success, false);
});

test("new users require a strong password", () => {
  assert.equal(
    createUserSchema.safeParse({
      name: "User",
      email: "user@example.com",
      password: "weak-password",
      role: "USER",
    }).success,
    false,
  );
});

test("RBAC rejects inactive and non-admin actors", () => {
  assert.doesNotThrow(() => assertAdmin({ role: "ADMIN", isActive: true }));
  assert.throws(() => assertAdmin({ role: "USER", isActive: true }));
  assert.throws(() => assertAdmin({ role: "ADMIN", isActive: false }));
});
