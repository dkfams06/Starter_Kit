import { requireApiUser } from "@/lib/auth/authorization";
import { listOrders, createOrder } from "@/modules/order-shipping/order-service";
import { masterError, assertSameOrigin } from "@/modules/order-shipping/master-http";
export async function GET(request: Request) {
  try { return Response.json(await listOrders(await requireApiUser(), Object.fromEntries(new URL(request.url).searchParams)), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return masterError(error); }
}
export async function POST(request: Request) {
  try { const actor = await requireApiUser(); assertSameOrigin(request); return Response.json({ item: await createOrder(actor, await request.json()) }, { status: 201 }); }
  catch (error) { return masterError(error); }
}
