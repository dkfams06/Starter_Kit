import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  UserManager,
  type ManagedUser,
} from "@/components/admin/user-manager";
import { requireAdminPage } from "@/lib/auth/authorization";
import {
  listRecentAuditLogs,
  listUsers,
} from "@/lib/users/admin-user-service";

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
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Administration
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">사용자 관리</h1>
          <p className="mt-2 text-slate-600">
            {actor.name ?? actor.email} · {actor.role}
          </p>
        </div>
        <SignOutButton />
      </header>

      <UserManager currentUserId={actor.id} initialUsers={serializedUsers} />

      <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">최근 감사 로그</h2>
        <ul className="mt-4 divide-y divide-slate-100">
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
        </ul>
      </section>
    </main>
  );
}
