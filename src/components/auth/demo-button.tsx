"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function DemoButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function enterDemo() {
    setPending(true);
    setError("");
    try {
      const result = await signIn("demo", { redirect: false });
      if (result?.error) throw new Error("demo unavailable");
      router.push("/admin/tasks");
      router.refresh();
    } catch {
      setError("데모에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally { setPending(false); }
  }
  return <div className="mt-6 space-y-2">
    <button type="button" onClick={enterDemo} disabled={pending} className="w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white disabled:opacity-60">
      {pending ? "데모 연결 중…" : "가입 없이 데모 체험하기"}
    </button>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>;
}
