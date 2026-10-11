import { requireAdminApi } from "@/lib/auth/authorization";
import { createUserSchema } from "@/lib/auth/validation";
import { errorResponse } from "@/lib/http-error";
import { createUser, listUsers } from "@/lib/users/admin-user-service";

export async function GET() {
  try {
    const actor = await requireAdminApi();
    return Response.json({ users: await listUsers(actor) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdminApi();
    const input = createUserSchema.parse(await request.json());
    const user = await createUser(actor, input);
    return Response.json({ user }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
