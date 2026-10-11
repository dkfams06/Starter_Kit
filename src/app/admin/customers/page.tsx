import Link from "next/link";
import { requirePageUser } from "@/lib/auth/authorization";
import { PageHeader } from "@/components/crud/page-header";
import { listCustomers } from "@/modules/order-shipping/customer-service";
import { MasterTable } from "@/modules/order-shipping/components/master-table";
import { type MasterRecord, masterLabels } from "@/modules/order-shipping/components/master-fields";
import { masterQuerySchema } from "@/modules/order-shipping/master-validation";

export const instant = false;
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requirePageUser();
  const parsed = masterQuerySchema.safeParse(await searchParams);
  const query = parsed.success ? parsed.data : masterQuerySchema.parse({});
  const result = await listCustomers(actor, query);
  const pageLink = (page: number) => `/admin/customers?${new URLSearchParams({ q: query.q, active: query.active, page: String(page) })}`;
  return <div className="space-y-6">
    <PageHeader title={masterLabels.customers + " 관리"} description="명칭·코드로 검색하고 상태를 확인하세요." action={actor.role === "ADMIN" && <Link className="rounded-lg bg-slate-900 px-4 py-2 text-white" href="/admin/customers/new">등록</Link>} />
    <form className="flex flex-wrap gap-3" method="get">
      <label className="text-sm">검색<input name="q" defaultValue={query.q} maxLength={120} placeholder="코드 또는 명칭" className="ml-2 rounded-lg border border-slate-300 px-3 py-2" /></label>
      <label className="text-sm">상태<select name="active" defaultValue={query.active} className="ml-2 rounded-lg border border-slate-300 px-3 py-2"><option value="all">전체</option><option value="true">활성</option><option value="false">비활성</option></select></label>
      <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm">검색</button>
    </form>
    <p className="text-sm text-slate-600">총 {result.total}건</p>
    <MasterTable kind="customers" items={JSON.parse(JSON.stringify(result.items)) as MasterRecord[]} />
    <nav aria-label="페이지 이동" className="flex gap-4 text-sm">
      {query.page > 1 && <Link href={pageLink(query.page - 1)}>이전</Link>}
      <span>{query.page} 페이지</span>
      {query.page * result.pageSize < result.total && <Link href={pageLink(query.page + 1)}>다음</Link>}
    </nav>
  </div>;
}
