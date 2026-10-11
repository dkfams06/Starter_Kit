import { requireApiUser } from "@/lib/auth/authorization";
import { errorResponse } from "@/lib/http-error";
import { createTask, listTasks } from "@/lib/tasks/task-service";
import { createTaskSchema } from "@/lib/tasks/task-validation";

export async function GET() {
  try {
    const actor = await requireApiUser();
    return Response.json({ tasks: await listTasks(actor) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireApiUser();
    const input = createTaskSchema.parse(await request.json());
    return Response.json({ task: await createTask(actor, input) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
