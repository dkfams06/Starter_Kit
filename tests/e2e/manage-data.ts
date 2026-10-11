import "dotenv/config";

import { writeAuditLog } from "../../src/lib/auth/audit";
import { hashPassword } from "../../src/lib/auth/password";
import { prisma } from "../../src/lib/prisma";
import { cleanupBrowserTestData } from "./database";
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./fixtures";

async function main() {
  await cleanupBrowserTestData();
  if (process.argv[2] !== "setup") return;

  const passwordHash = await hashPassword(E2E_ADMIN_PASSWORD);
  await prisma.$transaction(async (tx) => {
    const admin = await tx.user.create({
      data: {
        name: "E2E Admin",
        email: E2E_ADMIN_EMAIL,
        passwordHash,
        role: "ADMIN",
      },
    });
    await writeAuditLog({
      actorId: admin.id,
      action: "FIRST_ADMIN_CREATED",
      targetType: "User",
      targetId: admin.id,
    }, tx);
  });
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "E2E data operation failed.");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
