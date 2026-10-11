import { test } from "node:test";
import assert from "node:assert/strict";
import { isSafeDemoUser, isDemoEnabled } from "./demo-policy";
import { registerSchema } from "./validation";

test("demo access never accepts an admin, disabled, or password-bearing account", () => {
  assert.equal(isSafeDemoUser({ role: "USER", isActive: true, passwordHash: null }), true);
  for (const user of [
    { role: "ADMIN", isActive: true, passwordHash: null },
    { role: "USER", isActive: false, passwordHash: null },
    { role: "USER", isActive: true, passwordHash: "hash" },
  ]) assert.equal(isSafeDemoUser(user), false);
});

test("demo defaults closed and requires explicit true", () => {
  const previous = process.env.DEMO_MODE;
  try {
    delete process.env.DEMO_MODE; assert.equal(isDemoEnabled(), false);
    process.env.DEMO_MODE = "false"; assert.equal(isDemoEnabled(), false);
    process.env.DEMO_MODE = "true"; assert.equal(isDemoEnabled(), true);
  } finally {
    if (previous === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = previous;
  }
});

test("public signup rejects role injection, reserved email and weak passwords", () => {
  const input = { name: "Visitor", email: "Visitor@example.com", password: "Test-example-8273!" };
  assert.equal(registerSchema.parse(input).email, "visitor@example.com");
  for (const invalid of [
    { ...input, role: "ADMIN" }, { ...input, isActive: true },
    { ...input, email: "visitor@portfolio.invalid" }, { ...input, password: "weak" },
  ]) assert.equal(registerSchema.safeParse(invalid).success, false);
});
