"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await signIn("credentials", {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        redirect: false,
      });

      if (result?.error) {
        setError("이메일 또는 비밀번호를 확인해 주세요.");
        return;
      }

      router.push("/admin");
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="mt-8 space-y-5">
      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="email">
          이메일
        </label>
        <input
          autoComplete="email"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-700"
          id="email"
          name="email"
          required
          type="email"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="password">
          비밀번호
        </label>
        <input
          autoComplete="current-password"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-700"
          id="password"
          maxLength={128}
          name="password"
          required
          type="password"
        />
      </div>
      {error ? (
        <p aria-live="polite" className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "확인 중…" : "로그인"}
      </button>
    </form>
  );
}
