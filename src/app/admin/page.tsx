import { redirect } from "next/navigation";
import { EmptyState } from "@/components/crud/async-state";
import { PageHeader } from "@/components/crud/page-header";
import { requirePageUser } from "@/lib/auth/authorization";
import { getAdminDashboard } from "@/lib/dashboard/admin-dashboard-service";

export const instant = false;

export default async function AdminPage() {
  const actor = await requirePageUser();
  if (actor.role !== "ADMIN") redirect("/admin/tasks");

  const dashboard = await getAdminDashboard(actor);
  return (
    <div className="space-y-8">
      <PageHeader description="현재 Starter Kit 데이터베이스 기준 현황입니다." title="대시보드" />
      <section aria-label="사용자 현황" className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-600">전체 사용자</p>
          <p className="mt-2 text-4xl font-bold">{dashboard.userCount}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-600">활성 사용자</p>
          <p className="mt-2 text-4xl font-bold">{dashboard.activeUserCount}</p>
        </article>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">최근 활동</h2>
        {dashboard.recentActivity.length === 0 ? (
          <div className="mt-4"><EmptyState title="기록된 활동이 없습니다." /></div>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {dashboard.recentActivity.map((activity) => (
              <li className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm" key={activity.id}>
                <span><strong>{activity.action}</strong> · {activity.actor?.name ?? activity.actor?.email ?? "system"} · {activity.targetType}</span>
                <time className="text-slate-500" dateTime={activity.createdAt.toISOString()}>{activity.createdAt.toLocaleString("ko-KR")}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
