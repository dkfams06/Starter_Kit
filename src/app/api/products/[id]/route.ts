import { requireApiUser, requireAdminApi } from "@/lib/auth/authorization";
import { getProduct, updateProduct, deleteProduct } from "@/modules/order-shipping/product-service";
import { masterError, assertSameOrigin } from "@/modules/order-shipping/master-http";

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const actor = await requireApiUser();
    return Response.json({ item: await getProduct(actor, (await context.params).id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return masterError(error); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireAdminApi();
    assertSameOrigin(request);
    return Response.json({ item: await updateProduct(actor, (await context.params).id, await request.json()) });
  } catch (error) { return masterError(error); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await requireAdminApi();
    assertSameOrigin(request);
    await deleteProduct(actor, (await context.params).id, await request.json());
    return new Response(null, { status: 204 });
  } catch (error) { return masterError(error); }
}
