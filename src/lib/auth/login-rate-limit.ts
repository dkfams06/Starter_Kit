import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_IP = 10;

export async function isLoginRateLimited(ipAddress: string) {
  const failures = await prisma.auditLog.count({
    where: {
      action: "LOGIN_FAILURE",
      ipAddress,
      createdAt: {
        gte: new Date(Date.now() - WINDOW_MS),
      },
    },
  });

  return failures >= MAX_FAILURES_PER_IP;
}
