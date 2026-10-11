import type { ReactNode } from "react";
import { AdminShell, type AdminNavItem } from "@/components/admin/admin-shell";
import { requirePageUser } from "@/lib/auth/authorization";
import { isDemoEnabled } from "@/lib/auth/demo-policy";

export const instant = false;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requirePageUser();
  const items: AdminNavItem[] = [];
  if (user.role === "ADMIN") items.push({ href: "/admin", label: "대시보드" });
  items.push({ href: "/admin/tasks", label: "업무 예제" });
  if (user.role === "ADMIN") items.push({ href: "/admin/users", label: "사용자 관리" });

  return <AdminShell items={items} user={{ name: user.name, email: user.email, role: user.role }}>
    {isDemoEnabled() && <p role="note" className="mb-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">공개 체험 환경입니다. 업무 데이터는 방문자끼리 공유됩니다. 실제 개인정보나 업무 자료를 입력하지 마세요. 일반 사용자는 사용자 관리 및 삭제 기능을 사용할 수 없습니다.</p>}
    {children}
  </AdminShell>;
}
