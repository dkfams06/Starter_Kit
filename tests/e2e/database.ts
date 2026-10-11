import "dotenv/config";

import { prisma } from "../../src/lib/prisma";
import { E2E_ADMIN_EMAIL, E2E_TASK_PREFIX } from "./fixtures";

export async function cleanupBrowserTestData() {
  const users = await prisma.user.findMany({
    where: { email: { endsWith: "@starter-kit.e2e.invalid" } },
    select: { id: true },
  });
  const tasks = await prisma.task.findMany({
    where: { title: { startsWith: E2E_TASK_PREFIX } },
    select: { id: true },
  });
  const admin = await prisma.user.findUnique({
    where: { email: E2E_ADMIN_EMAIL },
    select: { id: true },
  });
  const adminLogs = admin
    ? await prisma.auditLog.findMany({
        where: { actorId: admin.id },
        select: { targetId: true },
      })
    : [];
  const targetIds = [
    ...users.map(({ id }) => id),
    ...tasks.map(({ id }) => id),
    ...adminLogs.flatMap(({ targetId }) => targetId ? [targetId] : []),
  ];

  if (users.length > 0 || targetIds.length > 0) {
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          ...(users.length > 0 ? [{ actorId: { in: users.map(({ id }) => id) } }] : []),
          ...(targetIds.length > 0 ? [{ targetId: { in: targetIds } }] : []),
        ],
      },
    });
  }
  await prisma.task.deleteMany({ where: { title: { startsWith: E2E_TASK_PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: "@starter-kit.e2e.invalid" } } });
}
