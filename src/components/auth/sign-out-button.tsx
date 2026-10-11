"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  async function logout() {
    setPending(true);
    setError(false);
    try {
      await signOut({ redirect: false });
      // Stay on the current host: AUTH_URL may use a different local alias.
      // A full navigation also clears the authenticated client router state.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Clear authenticated router state on logout.
      window.location.assign("/login");
    } catch {
      setError(true);
      setPending(false);
    }
  }
  return (
    <div>
    <button
      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100"
      onClick={logout}
      disabled={pending}
      type="button"
    >
      {pending ? "로그아웃 중…" : "로그아웃"}
    </button>
    {error && <p role="alert" className="text-sm text-red-700">로그아웃하지 못했습니다. 다시 시도해 주세요.</p>}
    </div>
  );
}
