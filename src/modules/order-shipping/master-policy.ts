import type { CurrentUser } from "@/lib/auth/authorization";
import { HttpError } from "@/lib/http-error";

export function assertMasterAccess(actor: CurrentUser, write = false) {
  if (!actor.isActive || !["ADMIN", "USER"].includes(actor.role) || (write && actor.role !== "ADMIN")) {
    throw new HttpError("기준정보 변경은 관리자만 가능합니다.", 403, "FORBIDDEN");
  }
}
