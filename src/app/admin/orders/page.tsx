import Link from "next/link";
import { requirePageUser } from "@/lib/auth/authorization";
import { PageHeader } from "@/components/crud/page-header";
import { listOrders, orderOptions } from "@/modules/order-shipping/order-service";
import { orderQuerySchema, statusLabels } from "@/modules/order-shipping/order-validation";
import { OrderTable } from "@/modules/order-shipping/components/order-table";
import { ExportButton } from "@/modules/order-shipping/components/export-button";
export const instant = false;
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requirePageUser();
  const parsed = orderQuerySchema.safeParse(await searchParams);
  const query = parsed.success ? parsed.data : orderQuerySchema.parse({});
  const [result, options] = await Promise.all([listOrders(actor, query), orderOptions(actor, true)]);
  const params = new URLSearchParams({ ...query, page: String(query.page) });
  const pageLink = (page: number) => `/admin/orders?${new URLSearchParams({ ...query, page: String(page) })}`;
  return <div className="space-y-6">
    <PageHeader title="주문 관리" description="접수 → 확인 → 전체 출고 순서로 처리합니다." action={<Link href="/admin/orders/new" className="rounded-lg bg-slate-900 px-4 py-2 text-white">주문 접수</Link>} />
    {!parsed.success && <p role="alert" className="text-red-700">검색 조건이 올바르지 않아 기본 목록을 표시합니다.</p>}
    <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4">
      <label>검색<input name="q" maxLength={120} defaultValue={query.q} placeholder="주문번호·거래처명" className="mt-1 block rounded-lg border p-2" /></label>
      <label>주문 상태<select name="status" defaultValue={query.status} className="mt-1 block rounded-lg border p-2"><option value="">전체</option>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>거래처 필터<select name="customerId" defaultValue={query.customerId} className="mt-1 block max-w-60 rounded-lg border p-2"><option value="">전체</option>{options.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>시작일<input name="from" type="date" defaultValue={query.from} className="mt-1 block rounded-lg border p-2" /></label>
      <label>종료일<input name="to" type="date" defaultValue={query.to} className="mt-1 block rounded-lg border p-2" /></label>
      <button className="rounded-lg bg-slate-800 px-4 py-2 text-white">검색</button>
    </form>
    <div className="flex items-center justify-between"><p>총 {result.total}건 · Asia/Seoul 기준</p><ExportButton query={params.toString()} /></div>
    <OrderTable items={JSON.parse(JSON.stringify(result.items))} />
    <nav aria-label="페이지 이동" className="flex gap-4">{query.page > 1 && <Link href={pageLink(query.page - 1)}>이전</Link>}<span>{query.page} 페이지</span>{query.page * 20 < result.total && <Link href={pageLink(query.page + 1)}>다음</Link>}</nav>
  </div>;
}
