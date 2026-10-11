import { TaskManager, type ManagedTask } from "@/components/tasks/task-manager";
import { requirePageUser } from "@/lib/auth/authorization";
import { listTasks } from "@/lib/tasks/task-service";

export const instant = false;

export default async function TasksPage() {
  const actor = await requirePageUser();
  const tasks = await listTasks(actor);
  const serialized: ManagedTask[] = tasks.map((task) => ({
    ...task,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }));
  return <TaskManager canDelete={actor.role === "ADMIN"} initialTasks={serialized} />;
}
