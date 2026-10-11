import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth/authorization";
import { HttpError } from "@/lib/http-error";
import { getProduct } from "@/modules/order-shipping/product-service";
import { MasterEditor } from "@/modules/order-shipping/components/master-editor";
import type { MasterRecord } from "@/modules/order-shipping/components/master-fields";
export const instant = false;
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageUser();
  let item;
  try { item = await getProduct(actor, (await params).id); }
  catch (error) { if (error instanceof HttpError && error.status === 404) notFound(); throw error; }
  return <MasterEditor key={item.updatedAt.toISOString()} kind="products" canEdit={actor.role === "ADMIN"} item={JSON.parse(JSON.stringify(item)) as MasterRecord} />;
}
