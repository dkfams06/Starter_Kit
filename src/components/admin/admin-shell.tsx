"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";

export type AdminNavItem = {
  href: string;
  label: string;
};

function Navigation({ items, onNavigate }: { items: AdminNavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="관리 메뉴" className="space-y-1">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`block rounded-xl px-4 py-3 text-sm font-semibold transition ${active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
            href={item.href}
            key={item.href}
            onClick={onNavigate}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({
  children,
  items,
  user,
}: {
  children: ReactNode;
  items: AdminNavItem[];
  user: { name: string | null; email: string; role: "ADMIN" | "USER" };
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r border-slate-200 bg-white p-5 lg:block">
        <Link className="block px-3 py-4 text-lg font-bold tracking-tight" href="/admin/tasks">Starter Kit</Link>
        <Navigation items={items} />
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label="메뉴 닫기" className="absolute inset-0 bg-slate-950/50" onClick={() => setMenuOpen(false)} type="button" />
          <aside className="relative h-full w-72 bg-white p-5 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <span className="px-3 text-lg font-bold">Starter Kit</span>
              <button aria-label="메뉴 닫기" className="rounded-lg px-3 py-2 text-xl hover:bg-slate-100" onClick={() => setMenuOpen(false)} type="button">×</button>
            </div>
            <Navigation items={items} onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <button aria-expanded={menuOpen} aria-label="관리 메뉴 열기" className="rounded-lg border border-slate-300 px-3 py-2 lg:hidden" onClick={() => setMenuOpen(true)} type="button">☰</button>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{user.name ?? user.email}</p>
              <p className="text-xs text-slate-500">{user.role}</p>
            </div>
            <SignOutButton />
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
