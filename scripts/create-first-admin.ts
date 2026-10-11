import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import { writeAuditLog } from "../src/lib/auth/audit";
import { hashPassword } from "../src/lib/auth/password";
import { firstAdminSchema } from "../src/lib/auth/validation";

async function main() {
  const input = firstAdminSchema.parse({
    name: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    role: "ADMIN",
  });

  const userCount = await prisma.user.count();
  if (userCount > 0) {
    throw new Error(
      "First administrator creation is only allowed when no users exist.",
    );
  }

  const passwordHash = await hashPassword(input.password);

  await prisma.$transaction(async (tx) => {
    const admin = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: "ADMIN",
      },
    });

    await writeAuditLog(
      {
        actorId: admin.id,
        action: "FIRST_ADMIN_CREATED",
        targetType: "User",
        targetId: admin.id,
      },
      tx,
    );
  });

  console.log("First administrator created.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Creation failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
