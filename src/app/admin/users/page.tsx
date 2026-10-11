import {
  UserManager,
  type ManagedUser,
} from "@/components/admin/user-manager";
import { requireAdminPage } from "@/lib/auth/authorization";
import {
  listRecentAuditLogs,
  listUsers,
} from "@/lib/users/admin-user-service";
import { PageHeader } from "@/components/crud/page-header";
import { EmptyState } from "@/components/crud/async-state";

export const instant = false;

export default async function AdminUsersPage() {
  const actor = await requireAdminPage();
  const [users, auditLogs] = await Promise.all([
    listUsers(actor),
    listRecentAuditLogs(actor),
  ]);

  const serializedUsers: ManagedUser[] = users.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-8">
      <PageHeader description="계정을 생성하고 역할 및 활성 상태를 관리합니다." title="사용자 관리" />

      <UserManager currentUserId={actor.id} initialUsers={serializedUsers} />

      <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">최근 감사 로그</h2>
        {auditLogs.length === 0 ? <div className="mt-4"><EmptyState title="감사 로그가 없습니다." /></div> : <ul className="mt-4 divide-y divide-slate-100">
          {auditLogs.map((log) => (
            <li className="flex flex-wrap justify-between gap-2 py-3 text-sm" key={log.id}>
              <span>
                <strong>{log.action}</strong> · {log.actor?.email ?? "system"}
              </span>
              <time dateTime={log.createdAt.toISOString()}>
                {log.createdAt.toLocaleString("ko-KR")}
              </time>
            </li>
          ))}
        </ul>}
      </section>
    </div>
  );
}
