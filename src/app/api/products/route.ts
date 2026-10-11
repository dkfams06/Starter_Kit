import { requireApiUser, requireAdminApi } from "@/lib/auth/authorization";
import { listProducts, createProduct } from "@/modules/order-shipping/product-service";
import { masterError, assertSameOrigin } from "@/modules/order-shipping/master-http";

export async function GET(request: Request) {
  try {
    const actor = await requireApiUser();
    return Response.json(await listProducts(actor, Object.fromEntries(new URL(request.url).searchParams)), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return masterError(error); }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdminApi();
    assertSameOrigin(request);
    return Response.json({ item: await createProduct(actor, await request.json()) }, { status: 201 });
  } catch (error) { return masterError(error); }
}
