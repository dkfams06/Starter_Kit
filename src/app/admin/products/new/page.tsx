import { requireAdminPage } from "@/lib/auth/authorization";
import { MasterEditor } from "@/modules/order-shipping/components/master-editor";
export const instant = false;
export default async function Page() {
  await requireAdminPage();
  return <MasterEditor kind="products" canEdit />;
}
