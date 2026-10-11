import type { AuditAction, Prisma, PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type AuditClient = PrismaClient | Prisma.TransactionClient;

type AuditInput = {
  actorId?: string | null;
  action: AuditAction;
  targetType: string;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export function writeAuditLog(input: AuditInput, client: AuditClient = prisma) {
  return client.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      metadata: input.metadata,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}

export async function writeAuditLogBestEffort(input: AuditInput) {
  try {
    await writeAuditLog(input);
  } catch {
    // Authentication must not expose infrastructure details to callers.
  }
}
