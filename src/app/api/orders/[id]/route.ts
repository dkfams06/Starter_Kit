import { requireApiUser } from "@/lib/auth/authorization";
import { getOrder, updateOrder, actOnOrder } from "@/modules/order-shipping/order-service";
import { masterError, assertSameOrigin } from "@/modules/order-shipping/master-http";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try { return Response.json({ item: await getOrder(await requireApiUser(), (await context.params).id) }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return masterError(error); }
}
export async function PATCH(request: Request, context: Context) {
  try { const actor = await requireApiUser(); assertSameOrigin(request); return Response.json({ item: await updateOrder(actor, (await context.params).id, await request.json()) }); }
  catch (error) { return masterError(error); }
}
export async function DELETE(request: Request, context: Context) {
  try { const actor = await requireApiUser(); assertSameOrigin(request); await actOnOrder(actor, (await context.params).id, "delete", await request.json()); return new Response(null, { status: 204 }); }
  catch (error) { return masterError(error); }
}
