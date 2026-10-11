import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/auth/audit";
import { hashPassword } from "@/lib/auth/password";
import type { CurrentUser } from "@/lib/auth/authorization";
import { assertAdmin } from "@/lib/auth/rbac";
import type {
  CreateUserInput,
  UpdateUserInput,
} from "@/lib/auth/validation";
import { HttpError } from "@/lib/http-error";

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export async function listUsers(actor: CurrentUser) {
  assertAdmin(actor);
  return prisma.user.findMany({
    select: safeUserSelect,
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });
}

export async function listRecentAuditLogs(actor: CurrentUser) {
  assertAdmin(actor);
  return prisma.auditLog.findMany({
    select: {
      id: true,
      action: true,
      targetType: true,
      targetId: true,
      createdAt: true,
      actor: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function createUser(actor: CurrentUser, input: CreateUserInput) {
  assertAdmin(actor);
  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
      },
      select: safeUserSelect,
    });

    await writeAuditLog(
      {
        actorId: actor.id,
        action: "USER_CREATED",
        targetType: "User",
        targetId: user.id,
        metadata: { role: user.role },
      },
      tx,
    );

    return user;
  });
}

export async function updateUser(
  actor: CurrentUser,
  userId: string,
  input: UpdateUserInput,
) {
  assertAdmin(actor);
  const passwordHash = input.password
    ? await hashPassword(input.password)
    : undefined;

  return prisma.$transaction(
    async (tx) => {
      const current = await tx.user.findUnique({ where: { id: userId } });
      if (!current) {
        throw new HttpError("사용자를 찾을 수 없습니다.", 404, "NOT_FOUND");
      }

      if (userId === actor.id && input.isActive === false) {
        throw new HttpError(
          "현재 계정은 비활성화할 수 없습니다.",
          409,
          "SELF_DEACTIVATION",
        );
      }

      const removesActiveAdmin =
        current.role === "ADMIN" &&
        current.isActive &&
        (input.role === "USER" || input.isActive === false);

      if (removesActiveAdmin) {
        const activeAdminCount = await tx.user.count({
          where: { role: "ADMIN", isActive: true },
        });
        if (activeAdminCount <= 1) {
          throw new HttpError(
            "마지막 활성 관리자는 변경할 수 없습니다.",
            409,
            "LAST_ADMIN",
          );
        }
      }

      const changedFields = Object.keys(input).filter(
        (field) => field !== "password",
      );
      if (input.password) changedFields.push("passwordHash");

      const user = await tx.user.update({
        where: { id: userId },
        data: {
          name: input.name,
          email: input.email,
          role: input.role,
          isActive: input.isActive,
          passwordHash,
        },
        select: safeUserSelect,
      });

      const action =
        input.isActive === false && current.isActive
          ? "USER_DEACTIVATED"
          : input.isActive === true && !current.isActive
            ? "USER_ACTIVATED"
            : "USER_UPDATED";

      await writeAuditLog(
        {
          actorId: actor.id,
          action,
          targetType: "User",
          targetId: user.id,
          metadata: { changedFields },
        },
        tx,
      );

      return user;
    },
    { isolationLevel: "Serializable" },
  );
}

export async function deleteUser(actor: CurrentUser, userId: string) {
  assertAdmin(actor);

  await prisma.$transaction(
    async (tx) => {
      const target = await tx.user.findUnique({ where: { id: userId } });
      if (!target) {
        throw new HttpError("사용자를 찾을 수 없습니다.", 404, "NOT_FOUND");
      }
      if (target.id === actor.id) {
        throw new HttpError(
          "현재 계정은 삭제할 수 없습니다.",
          409,
          "SELF_DELETION",
        );
      }
      if (target.isActive) {
        throw new HttpError(
          "삭제 전에 계정을 비활성화해야 합니다.",
          409,
          "ACTIVE_USER",
        );
      }

      await writeAuditLog(
        {
          actorId: actor.id,
          action: "USER_DELETED",
          targetType: "User",
          targetId: target.id,
          metadata: { email: target.email, role: target.role },
        },
        tx,
      );
      await tx.user.delete({ where: { id: target.id } });
    },
    { isolationLevel: "Serializable" },
  );
}
