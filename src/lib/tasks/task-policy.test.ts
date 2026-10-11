import assert from "node:assert/strict";
import test from "node:test";
import type { CurrentUser } from "@/lib/auth/authorization";
import { assertCanDeleteTask, assertCanUseTasks } from "@/lib/tasks/task-policy";

function actor(role: "ADMIN" | "USER"): CurrentUser {
  return { id: "test", name: null, email: "test@example.invalid", role, isActive: true };
}

test("ADMIN과 USER는 Task를 조회·변경할 수 있다", () => {
  assert.doesNotThrow(() => assertCanUseTasks(actor("ADMIN")));
  assert.doesNotThrow(() => assertCanUseTasks(actor("USER")));
});

test("Task 삭제는 ADMIN만 가능하다", () => {
  assert.doesNotThrow(() => assertCanDeleteTask(actor("ADMIN")));
  assert.throws(() => assertCanDeleteTask(actor("USER")), { status: 403, code: "FORBIDDEN" });
});
