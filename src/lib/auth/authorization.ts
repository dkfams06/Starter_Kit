import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/http-error";

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  isActive: true;
};

async function loadCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  if (!user?.isActive) return null;

  return { ...user, isActive: true };
}

export const getCurrentUser = cache(loadCurrentUser);

export async function requirePageUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdminPage() {
  const user = await requirePageUser();
  if (user.role !== "ADMIN") redirect("/forbidden");
  return user;
}

export async function requireApiUser() {
  const user = await loadCurrentUser();
  if (!user) {
    throw new HttpError("인증이 필요합니다.", 401, "UNAUTHORIZED");
  }
  return user;
}

export async function requireAdminApi() {
  const user = await requireApiUser();
  if (user.role !== "ADMIN") {
    throw new HttpError("관리자 권한이 필요합니다.", 403, "FORBIDDEN");
  }
  return user;
}
