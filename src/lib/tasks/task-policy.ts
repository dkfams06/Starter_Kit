import type { CurrentUser } from "@/lib/auth/authorization";
import { HttpError } from "@/lib/http-error";

export function assertCanUseTasks(actor: CurrentUser) {
  if (!actor.isActive || (actor.role !== "ADMIN" && actor.role !== "USER")) {
    throw new HttpError("업무 접근 권한이 없습니다.", 403, "FORBIDDEN");
  }
}

export function assertCanDeleteTask(actor: CurrentUser) {
  assertCanUseTasks(actor);
  if (actor.role !== "ADMIN") {
    throw new HttpError("업무 삭제는 관리자만 가능합니다.", 403, "FORBIDDEN");
  }
}
