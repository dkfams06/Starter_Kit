import "dotenv/config";

import assert from "node:assert/strict";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { prisma } from "../src/lib/prisma";

const baseUrl = "http://127.0.0.1:3002";
const adminEmail = "auth-admin@example.invalid";
const userEmail = "auth-user@example.invalid";
const adminPassword = `${randomBytes(24).toString("base64url")}Aa1!`;
const userPassword = `${randomBytes(24).toString("base64url")}Aa1!`;

class CookieJar {
  private readonly values = new Map<string, string>();

  async fetch(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    if (this.values.size > 0) {
      headers.set(
        "cookie",
        [...this.values.entries()].map(([key, value]) => `${key}=${value}`).join("; "),
      );
    }

    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
      redirect: init.redirect ?? "manual",
    });

    for (const setCookie of response.headers.getSetCookie()) {
      const pair = setCookie.split(";", 1)[0];
      const separator = pair.indexOf("=");
      if (separator > 0) {
        this.values.set(pair.slice(0, separator), pair.slice(separator + 1));
      }
    }

    return response;
  }
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // The development server is still starting.
    }
    await delay(500);
  }
  throw new Error("Development server did not become ready.");
}

async function login(jar: CookieJar, email: string, password: string) {
  const csrfResponse = await jar.fetch("/api/auth/csrf");
  assert.equal(csrfResponse.status, 200);
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };

  const response = await jar.fetch("/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-auth-return-redirect": "1",
    },
    body: new URLSearchParams({
      csrfToken,
      email,
      password,
      callbackUrl: `${baseUrl}/admin/users`,
    }),
  });

  assert.equal(response.status, 200);
  return (await response.json()) as { url: string };
}

async function cleanup() {
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { actor: { email: { endsWith: "@example.invalid" } } },
        { targetType: "User", targetId: { not: null } },
      ],
    },
  });
  await prisma.user.deleteMany({
    where: { email: { endsWith: "@example.invalid" } },
  });
}

async function main() {
  if (process.env.E2E_AUTH_TESTS !== "1") {
    throw new Error("Set E2E_AUTH_TESTS=1 to run destructive local auth tests.");
  }
  if ((await prisma.user.count()) !== 0) {
    throw new Error("Auth E2E requires an empty Starter Kit user table.");
  }

  const createAdmin = spawnSync("pnpm", ["admin:create"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ADMIN_NAME: "E2E Admin",
      ADMIN_EMAIL: adminEmail,
      ADMIN_PASSWORD: adminPassword,
    },
    encoding: "utf8",
  });
  assert.equal(createAdmin.status, 0, createAdmin.stderr || "Admin creation failed");

  let server: ChildProcess | undefined;
  try {
    server = spawn("pnpm", ["dev"], {
      cwd: process.cwd(),
      env: process.env,
      stdio: "ignore",
    });
    await waitForServer();

    const anonymous = new CookieJar();
    assert.equal((await anonymous.fetch("/api/admin/users")).status, 401);
    assert.equal((await anonymous.fetch("/admin/users")).status, 307);

    const invalid = await login(anonymous, adminEmail, "Wrong-password-123!");
    assert.match(invalid.url, /error=CredentialsSignin/);

    const admin = new CookieJar();
    const adminLogin = await login(admin, adminEmail, adminPassword);
    assert.doesNotMatch(adminLogin.url, /error=/);
    assert.equal((await admin.fetch("/api/admin/users")).status, 200);

    const createResponse = await admin.fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "E2E User",
        email: userEmail,
        password: userPassword,
        role: "USER",
      }),
    });
    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()) as { user: { id: string } };

    const user = new CookieJar();
    const userLogin = await login(user, userEmail, userPassword);
    assert.doesNotMatch(userLogin.url, /error=/);
    assert.equal((await user.fetch("/api/admin/users")).status, 403);

    const deactivateResponse = await admin.fetch(
      `/api/admin/users/${created.user.id}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      },
    );
    assert.equal(deactivateResponse.status, 200);
    assert.equal((await user.fetch("/api/admin/users")).status, 401);

    assert.equal(
      (
        await admin.fetch(`/api/admin/users/${created.user.id}`, {
          method: "DELETE",
        })
      ).status,
      204,
    );

    const adminRecord = await prisma.user.findUniqueOrThrow({
      where: { email: adminEmail },
      select: { id: true },
    });
    assert.equal(
      (
        await admin.fetch(`/api/admin/users/${adminRecord.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ isActive: false }),
        })
      ).status,
      409,
    );

    assert.ok(await prisma.auditLog.count());
    console.log("Auth E2E passed: login, RBAC, deactivation, and admin safeguards.");
  } finally {
    server?.kill("SIGTERM");
    await delay(300);
    await cleanup();
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Auth E2E failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
