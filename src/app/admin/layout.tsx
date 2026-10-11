import type { ReactNode } from "react";
import { AdminShell, type AdminNavItem } from "@/components/admin/admin-shell";
import { requirePageUser } from "@/lib/auth/authorization";

export const instant = false;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requirePageUser();
  const items: AdminNavItem[] = [{ href: "/admin/tasks", label: "업무 예제" }];
  if (user.role === "ADMIN") items.push({ href: "/admin/users", label: "사용자 관리" });

  return <AdminShell items={items} user={{ name: user.name, email: user.email, role: user.role }}>{children}</AdminShell>;
}
