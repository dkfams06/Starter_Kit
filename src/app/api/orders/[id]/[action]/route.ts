import { z } from "zod";
import { requireApiUser } from "@/lib/auth/authorization";
import { actOnOrder } from "@/modules/order-shipping/order-service";
import { masterError, assertSameOrigin } from "@/modules/order-shipping/master-http";
export async function POST(request: Request, context: { params: Promise<{ id: string; action: string }> }) {
  try {
    const actor = await requireApiUser(); assertSameOrigin(request);
    const { id, action } = await context.params;
    const parsed = z.enum(["confirm", "revert-confirmation", "cancel", "ship"]).parse(action);
    return Response.json({ item: await actOnOrder(actor, id, parsed, await request.json()) });
  } catch (error) { return masterError(error); }
}
