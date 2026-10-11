import { requireApiUser, requireAdminApi } from "@/lib/auth/authorization";
import { getCustomer, updateCustomer, deleteCustomer } from "@/modules/order-shipping/customer-service";
import { masterError, assertSameOrigin } from "@/modules/order-shipping/master-http";

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const actor = await requireApiUser();
    return Response.json({ item: await getCustomer(actor, (await context.params).id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return masterError(error); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireAdminApi();
    assertSameOrigin(request);
    return Response.json({ item: await updateCustomer(actor, (await context.params).id, await request.json()) });
  } catch (error) { return masterError(error); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await requireAdminApi();
    assertSameOrigin(request);
    await deleteCustomer(actor, (await context.params).id, await request.json());
    return new Response(null, { status: 204 });
  } catch (error) { return masterError(error); }
}
