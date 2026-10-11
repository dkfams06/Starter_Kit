import "dotenv/config";
import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import pg from "pg";

test("public demo and signup preserve USER permissions", async ({ page }) => {
  test.setTimeout(120_000);
  const email = `e2e-${randomUUID()}@example.com`;
  const password = `E2e-${randomUUID()}!`;
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    await page.goto("/login");
    await page.getByRole("button", { name: "가입 없이 데모 체험하기" }).click();
    await expect(page).toHaveURL(/\/admin\/tasks$/, { timeout: 30_000 });
    expect((await page.request.get("/api/admin/users")).status()).toBe(403);
    expect((await page.request.post("/api/admin/users", { data: { role: "ADMIN" } })).status()).toBe(403);
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/forbidden$/);
    await page.goto("/admin/tasks");
    await page.getByRole("button", { name: "로그아웃" }).click();
    await expect(page).toHaveURL(/\/login$/);
    // Passwordless demo identity must never authenticate through the password provider.
    await page.getByLabel("이메일").fill("visitor@portfolio.invalid");
    await page.getByLabel("비밀번호", { exact: true }).fill("Dummy-password-1!not-an-account");
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await expect(page.locator('p[role="alert"]:visible')).toBeVisible();
    expect((await page.request.get("/api/tasks")).status()).toBe(401);
    await page.getByRole("link", { name: "체험 계정 만들기" }).click();
    await page.getByLabel("이름", { exact: true }).fill("E2E public visitor");
    await page.getByLabel("이메일", { exact: true }).fill(email);
    await page.getByLabel("비밀번호", { exact: true }).fill(password);
    await page.getByLabel("비밀번호 확인").fill(password);
    await page.locator("form").filter({ has: page.locator('input[name="confirmation"]') }).evaluate((form) => {
      const input = document.createElement("input");
      input.type = "hidden"; input.name = "role"; input.value = "ADMIN";
      form.appendChild(input);
    });
    await page.getByRole("button", { name: "계정 만들기" }).click();
    await expect(page.locator('p[role="alert"]:visible')).toBeVisible();
    expect((await db.query('SELECT id FROM "User" WHERE email=$1', [email])).rowCount).toBe(0);
    await page.locator('input[name="role"]').evaluate((input) => input.remove());
    await page.getByRole("button", { name: "계정 만들기" }).click();
    await expect(page.getByText("계정이 생성되었습니다.", { exact: false })).toBeVisible({ timeout: 30_000 });
    const { rows } = await db.query('SELECT role, "passwordHash" FROM "User" WHERE email=$1', [email]);
    expect(rows[0].role).toBe("USER");
    expect(rows[0].passwordHash).toMatch(/^\$argon2id\$/);
    await page.getByRole("link", { name: "로그인하기", exact: true }).click();
    await page.getByLabel("이메일").fill(email);
    await page.getByLabel("비밀번호", { exact: true }).fill(password);
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/tasks$/, { timeout: 30_000 });
    await page.reload();
    await expect(page.getByText("E2E public visitor", { exact: true })).toBeVisible();
    expect(await page.evaluate(async () => (await fetch("/api/admin/users", { cache: "no-store" })).status)).toBe(403);
    const audit = await db.query('SELECT count(*)::int AS n FROM "AuditLog" WHERE "targetId" IN (SELECT id FROM "User" WHERE email=$1) AND action=\'USER_CREATED\'', [email]);
    expect(audit.rows[0].n).toBe(1);
  } finally {
    await db.query('DELETE FROM "AuditLog" WHERE "actorId" IN (SELECT id FROM "User" WHERE email=$1) OR "targetId" IN (SELECT id FROM "User" WHERE email=$1)', [email]);
    await db.query('DELETE FROM "User" WHERE email=$1', [email]);
    await db.end();
  }
});
