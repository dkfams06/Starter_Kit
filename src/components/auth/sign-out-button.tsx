"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100"
      onClick={() => signOut({ callbackUrl: "/login" })}
      type="button"
    >
      로그아웃
    </button>
  );
}
