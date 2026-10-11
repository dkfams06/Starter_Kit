import { requireApiUser } from "@/lib/auth/authorization";
import { exportOrders } from "@/modules/order-shipping/export-service";
import { masterError } from "@/modules/order-shipping/master-http";
export async function GET(request: Request) {
  try {
    const bytes = await exportOrders(await requireApiUser(), Object.fromEntries(new URL(request.url).searchParams));
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="orders.xlsx"',
      "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) { return masterError(error); }
}
