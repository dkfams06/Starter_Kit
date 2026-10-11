import type { Prisma } from "@/generated/prisma/client";

// Reset takes the exclusive counterpart; normal writes share the lock.
export async function lockBusinessWrite(tx: Prisma.TransactionClient) {
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock_shared(73110402)`;
}
