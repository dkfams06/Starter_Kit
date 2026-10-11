import type { Role } from "@/generated/prisma/client";
import { HttpError } from "@/lib/http-error";

type Actor = {
  role: Role;
  isActive: boolean;
};

export function assertAdmin(actor: Actor) {
  if (!actor.isActive || actor.role !== "ADMIN") {
    throw new HttpError("관리자 권한이 필요합니다.", 403, "FORBIDDEN");
  }
}
