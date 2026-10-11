import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth/authorization";
import { HttpError } from "@/lib/http-error";
import { PageHeader } from "@/components/crud/page-header";
import { getOrder, orderOptions } from "@/modules/order-shipping/order-service";
import { statusLabels } from "@/modules/order-shipping/order-validation";
import { OrderEditor } from "@/modules/order-shipping/components/order-editor";
import { OrderActions } from "@/modules/order-shipping/components/order-actions";
import type { OrderView } from "@/modules/order-shipping/components/order-types";
export const instant = false;
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageUser();
  let result;
  try { result = await getOrder(actor, (await params).id); }
  catch (error) { if (error instanceof HttpError && error.status === 404) notFound(); throw error; }
  const order: OrderView = JSON.parse(JSON.stringify(result));
  const options = JSON.parse(JSON.stringify(await orderOptions(actor)));
  return <div className="space-y-6">
    <PageHeader title={order.orderNo} description={`상태: ${statusLabels[order.status]} · 버전 ${order.version} · 저장 금액 ${order.totalAmount} 원`} />
    <Link href="/admin/orders" className="text-blue-700 underline">주문 목록으로</Link>
    <p>주문 당시 거래처: {order.customerCodeSnapshot} · {order.customerNameSnapshot}</p>
    <OrderEditor key={`${order.id}-${order.version}`} order={order} options={options} />
    <OrderActions key={`actions-${order.version}`} order={order} isAdmin={actor.role === "ADMIN"} />
    {order.shipment && <section className="rounded-xl border bg-white p-5"><h2 className="font-semibold">출고 정보</h2><p>{new Date(order.shipment.shippedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} · {order.shipment.carrier ?? "운송사 미입력"} · {order.shipment.trackingNumber ?? "송장번호 미입력"}</p><p>{order.shipment.memo}</p></section>}
    <section className="rounded-xl border bg-white p-5"><h2 className="font-semibold">처리 이력 (최근 100건)</h2><ul className="mt-3 divide-y">{order.history.map(h => <li key={h.id} className="py-3 text-sm">{h.action} · {h.actor?.name ?? "시스템/삭제된 사용자"} · {new Date(h.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}{h.metadata?.reason && <p>사유: {h.metadata.reason}</p>}</li>)}</ul></section>
  </div>;
}
