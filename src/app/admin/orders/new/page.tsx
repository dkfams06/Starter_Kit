import { requirePageUser } from "@/lib/auth/authorization";
import { PageHeader } from "@/components/crud/page-header";
import { orderOptions } from "@/modules/order-shipping/order-service";
import { OrderEditor } from "@/modules/order-shipping/components/order-editor";
export const instant = false;
export default async function Page() {
  const actor = await requirePageUser();
  const options = await orderOptions(actor);
  return <div className="space-y-6"><PageHeader title="주문 접수" description="활성 거래처·품목을 선택하세요. 거래처와 품목은 관리자만 등록할 수 있습니다." /><OrderEditor options={JSON.parse(JSON.stringify(options))} /></div>;
}
