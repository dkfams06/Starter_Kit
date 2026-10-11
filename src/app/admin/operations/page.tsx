import Link from "next/link";
import { requirePageUser } from "@/lib/auth/authorization";
import { PageHeader } from "@/components/crud/page-header";
import { operationsDashboard } from "@/modules/order-shipping/order-service";
export const instant = false;
export default async function Page() {
  const data = await operationsDashboard(await requirePageUser());
  return <div className="space-y-6">
    <PageHeader title="업무 현황" description="실제 DB · Asia/Seoul 업무일 기준" action={<Link href="/admin/orders/new" className="rounded-lg bg-slate-900 px-4 py-2 text-white">주문 접수</Link>} />
    <section aria-label="업무 지표" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["오늘 접수", data.receivedToday], ["확인 대기", data.waitingConfirmation], ["출고 대기", data.waitingShipment], ["오늘 출고", data.shippedToday]].map(([label, count]) => <article key={label} className="rounded-2xl border bg-white p-6"><h2>{label}</h2><p className="mt-3 text-4xl font-bold">{count}</p></article>)}</section>
    <section className="rounded-2xl border bg-white p-6"><h2 className="text-lg font-semibold">최근 주문 활동</h2>{!data.recent.length ? <p className="mt-4 text-slate-500">아직 주문 활동이 없습니다.</p> : <ul className="mt-3 divide-y">{data.recent.map(a => <li key={a.id} className="py-3 text-sm">{a.action} · {typeof a.metadata === "object" && a.metadata && "orderNo" in a.metadata ? String(a.metadata.orderNo) : ""} · {a.actor?.name ?? "시스템/삭제된 사용자"} · {a.createdAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</li>)}</ul>}</section>
    <Link href="/admin/orders" className="text-blue-700 underline">전체 주문 보기</Link>
  </div>;
}
