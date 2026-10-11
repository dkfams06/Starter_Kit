import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/auth/authorization";
import { writeAuditLog } from "@/lib/auth/audit";
import { HttpError } from "@/lib/http-error";
import { prisma } from "@/lib/prisma";
import { assertCanDeleteTask, assertCanUseTasks } from "@/lib/tasks/task-policy";
import type { CreateTaskInput, UpdateTaskInput } from "@/lib/tasks/task-validation";

const taskSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TaskSelect;

export async function listTasks(actor: CurrentUser) {
  assertCanUseTasks(actor);
  return prisma.task.findMany({ select: taskSelect, orderBy: { updatedAt: "desc" } });
}

export async function createTask(actor: CurrentUser, input: CreateTaskInput) {
  assertCanUseTasks(actor);
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.create({ data: input, select: taskSelect });
    await writeAuditLog({
      actorId: actor.id,
      action: "TASK_CREATED",
      targetType: "Task",
      targetId: task.id,
    }, tx);
    return task;
  });
}

export async function updateTask(actor: CurrentUser, taskId: string, input: UpdateTaskInput) {
  assertCanUseTasks(actor);
  const exists = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true } });
  if (!exists) throw new HttpError("업무를 찾을 수 없습니다.", 404, "NOT_FOUND");
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.update({ where: { id: taskId }, data: input, select: taskSelect });
    await writeAuditLog({
      actorId: actor.id,
      action: "TASK_UPDATED",
      targetType: "Task",
      targetId: task.id,
      metadata: { changedFields: Object.keys(input) },
    }, tx);
    return task;
  });
}

export async function deleteTask(actor: CurrentUser, taskId: string) {
  assertCanDeleteTask(actor);
  await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({ where: { id: taskId }, select: { id: true } });
    if (!task) throw new HttpError("업무를 찾을 수 없습니다.", 404, "NOT_FOUND");
    await writeAuditLog({
      actorId: actor.id,
      action: "TASK_DELETED",
      targetType: "Task",
      targetId: task.id,
    }, tx);
    await tx.task.delete({ where: { id: task.id } });
  });
}
