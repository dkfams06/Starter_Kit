import "server-only";

import type { CurrentUser } from "@/lib/auth/authorization";
import { assertAdmin } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";

export async function getAdminDashboard(actor: CurrentUser) {
  assertAdmin(actor);
  const [userCount, activeUserCount, recentActivity] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.auditLog.findMany({
      select: {
        id: true,
        action: true,
        targetType: true,
        createdAt: true,
        actor: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return { userCount, activeUserCount, recentActivity };
}
