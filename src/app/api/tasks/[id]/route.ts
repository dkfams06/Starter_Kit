import { requireApiUser } from "@/lib/auth/authorization";
import { errorResponse } from "@/lib/http-error";
import { deleteTask, updateTask } from "@/lib/tasks/task-service";
import { updateTaskSchema } from "@/lib/tasks/task-validation";

type TaskRouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: TaskRouteContext) {
  try {
    const actor = await requireApiUser();
    const { id } = await context.params;
    const input = updateTaskSchema.parse(await request.json());
    return Response.json({ task: await updateTask(actor, id, input) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: TaskRouteContext) {
  try {
    const actor = await requireApiUser();
    const { id } = await context.params;
    await deleteTask(actor, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
