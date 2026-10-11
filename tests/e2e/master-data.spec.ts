import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { test, expect } from "@playwright/test";
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./fixtures";

test("master data CRUD, decimal prices, audit and ADMIN/USER boundaries", async ({ page }) => {
  test.setTimeout(120_000);
  const prefix = `E2E-MASTER-${randomUUID().slice(0, 8).toUpperCase()}`;
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const created: { kind: string; id: string; code: string }[] = [];
  const origin = { origin: "http://127.0.0.1:3002" };
  try {
    expect((await page.request.get("/api/customers")).status()).toBe(401);
    await page.goto("/login");
    await page.getByLabel("이메일").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("비밀번호", { exact: true }).fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await expect(page).toHaveURL(/\/admin$/);
    for (const kind of ["customers", "products"]) {
      const code = `${prefix}-${kind === "customers" ? "C" : "P"}`;
      await page.goto(`/admin/${kind}/new`);
      await page.getByLabel("코드").fill(code.toLowerCase());
      await page.getByLabel("명칭").fill(`${code} 최초`);
      if (kind === "products") {
        await page.getByLabel("단위").fill("BOX");
        await page.getByLabel("기준 단가 (원)").fill("1234.50");
      } else await page.getByLabel("기본 배송지").fill("가상 주소");
      await page.getByRole("button", { name: "저장", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/admin/${kind}/(?!new)[^/]+$`));
      const id = new URL(page.url()).pathname.split("/").at(-1)!;
      created.push({ kind, id, code });
      await page.locator("form:visible").getByLabel("명칭").fill(`${code} 수정`);
      await page.locator('form:visible select[name="isActive"]').selectOption("false");
      await page.getByRole("button", { name: "저장", exact: true }).click();
      await expect.poll(async () => {
        const { item } = await (await page.request.get(`/api/${kind}/${id}`)).json();
        return item.isActive;
      }).toBe(false);
      const duplicate = await page.request.post(`/api/${kind}`, { headers: origin, data: { code, name: "duplicate", ...(kind === "products" ? { unit: "EA" } : {}) } });
      expect(duplicate.status()).toBe(409);
      expect((await page.request.patch(`/api/${kind}/${id}`, { headers: { origin: "https://invalid.example" }, data: { name: "forged" } })).status()).toBe(403);
      expect((await page.request.delete(`/api/${kind}/${id}`, { headers: origin, data: { reason: "" } })).status()).toBe(400);
      if (kind === "products") {
        const saved = await db.query('SELECT "defaultUnitPrice"::text AS price FROM "Product" WHERE id=$1', [id]);
        expect(saved.rows[0].price).toBe("1234.50");
        expect((await page.request.patch(`/api/products/${id}`, { headers: origin, data: { defaultUnitPrice: "1.001" } })).status()).toBe(400);
      }
      await page.goto(`/admin/${kind}?q=${code}&active=false`);
      await expect(page.getByRole("link", { name: `${code} 수정` })).toBeVisible();
      const logs = await db.query('SELECT action FROM "AuditLog" WHERE "targetId"=$1 ORDER BY "createdAt"', [id]);
      expect(logs.rows.map(row => row.action)).toEqual([kind === "customers" ? "CUSTOMER_CREATED" : "PRODUCT_CREATED", kind === "customers" ? "CUSTOMER_DEACTIVATED" : "PRODUCT_DEACTIVATED"]);
    }
    await page.getByRole("button", { name: "로그아웃" }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(new URL(page.url()).origin).toBe(origin.origin);
    expect(await page.evaluate(async () => (await fetch('/api/customers')).status)).toBe(401);
    await page.getByRole("button", { name: "가입 없이 데모 체험하기" }).click();
    await expect(page).toHaveURL(/\/admin\/tasks$/);
    expect(await page.evaluate(async () => (await (await fetch('/api/auth/session')).json()).user?.role)).toBe('USER');
    for (const { kind, id } of created) {
      await page.goto(`/admin/${kind}/${id}`);
      await expect(page.getByLabel("명칭")).toBeDisabled();
      expect((await page.request.get(`/api/${kind}/${id}`)).status()).toBe(200);
      for (const method of ["post", "patch", "delete"] as const) {
        expect((await page.request[method](`/api/${kind}${method === "post" ? "" : `/${id}`}`, { headers: origin, data: { reason: "test" } })).status()).toBe(403);
      }
      await page.goto(`/admin/${kind}/new`);
      await expect(page).toHaveURL(/\/forbidden$/);
    }
    await page.goto("/admin/tasks");
    await page.getByRole("button", { name: "로그아웃" }).click();
    await page.goto("/login");
    await page.getByLabel("이메일").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("비밀번호", { exact: true }).fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await expect(page).toHaveURL(/\/admin$/);
    for (const { kind, id } of created) {
      await page.goto(`/admin/${kind}/${id}`);
      await page.getByLabel("삭제 사유").fill("E2E 오입력 정리");
      await page.getByRole("button", { name: "삭제", exact: true }).click();
      await page.getByRole("button", { name: "영구 삭제", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/admin/${kind}$`));
      expect((await page.request.get(`/api/${kind}/${id}`)).status()).toBe(404);
      const logs = await db.query('SELECT metadata FROM "AuditLog" WHERE "targetId"=$1 AND action::text LIKE $2', [id, "%_DELETED"]);
      expect(logs.rows[0].metadata.reason).toBe("E2E 오입력 정리");
    }
  } finally {
    // Remove only this run's prefix, including records created before a UI failure.
    const records = await db.query('SELECT id FROM "Customer" WHERE code LIKE $1 UNION SELECT id FROM "Product" WHERE code LIKE $1', [`${prefix}%`]);
    const ids = [...created.map(v => v.id), ...records.rows.map(v => v.id)];
    await db.query('DELETE FROM "AuditLog" WHERE "targetId" = ANY($1::text[])', [ids]);
    await db.query('DELETE FROM "Customer" WHERE code LIKE $1', [`${prefix}%`]);
    await db.query('DELETE FROM "Product" WHERE code LIKE $1', [`${prefix}%`]);
    await db.end();
  }
});
