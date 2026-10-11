import type { CurrentUser } from "@/lib/auth/authorization";
import { HttpError } from "@/lib/http-error";
import { assertMasterAccess } from "./master-policy";
import type { statuses } from "./order-validation";

export type OrderAction = "update" | "confirm" | "revert-confirmation" | "cancel" | "ship" | "delete";
type State = { status: typeof statuses[number]; firstConfirmedAt: Date | string | null };
export function assertOrderAction(actor: CurrentUser, order: State, action: OrderAction) {
  assertMasterAccess(actor);
  if ((action === "delete" || action === "revert-confirmation" || (action === "cancel" && order.status === "CONFIRMED")) && actor.role !== "ADMIN") {
    throw new HttpError("관리자 권한이 필요합니다.", 403, "FORBIDDEN");
  }
  const allowed = action === "update" || action === "confirm" ? order.status === "RECEIVED"
    : action === "ship" || action === "revert-confirmation" ? order.status === "CONFIRMED"
    : action === "delete" ? order.status === "RECEIVED" && order.firstConfirmedAt === null
    : order.status === "RECEIVED" || order.status === "CONFIRMED";
  if (!allowed) throw new HttpError("현재 상태에서는 처리할 수 없습니다. 새로고침 후 확인하세요.", 409, "INVALID_STATE");
}
