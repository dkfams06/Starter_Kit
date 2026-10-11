import { requireAdminApi } from "@/lib/auth/authorization";
import { updateUserSchema } from "@/lib/auth/validation";
import { errorResponse } from "@/lib/http-error";
import { deleteUser, updateUser } from "@/lib/users/admin-user-service";

type UserRouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: UserRouteContext) {
  try {
    const actor = await requireAdminApi();
    const { id } = await context.params;
    const input = updateUserSchema.parse(await request.json());
    return Response.json({ user: await updateUser(actor, id, input) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: UserRouteContext) {
  try {
    const actor = await requireAdminApi();
    const { id } = await context.params;
    await deleteUser(actor, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
