"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { registerSchema } from "@/lib/auth/validation";
import { isDemoEnabled } from "@/lib/auth/demo-policy";

export async function registerAccount(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  if (!isDemoEnabled()) return { error: "현재 회원가입을 제공하지 않습니다." };
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    // Bound public account creation globally. Serialize the quota check and insert.
    const passwordHash = await hashPassword(parsed.data.password);
    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(701002)`;
      const recent = await tx.auditLog.count({ where: {
        action: "USER_CREATED", metadata: { path: ["source"], equals: "public-signup" },
        createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
      } });
      if (recent >= 10 || await tx.user.count() >= 1000) {
        return { error: "가입 요청이 많습니다. 잠시 후 다시 시도해 주세요." };
      }
      const user = await tx.user.create({ data: {
        name: parsed.data.name, email: parsed.data.email, passwordHash,
        role: "USER", isActive: true,
      } });
      await tx.auditLog.create({ data: {
        actorId: user.id, action: "USER_CREATED", targetType: "User", targetId: user.id,
        metadata: { source: "public-signup" },
      } });
      return { success: true };
    });
  } catch {
    return { error: "가입할 수 없습니다. 입력 정보를 확인하거나 기존 계정으로 로그인해 주세요." };
  }
}
