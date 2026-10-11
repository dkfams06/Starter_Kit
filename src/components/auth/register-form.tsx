"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { registerAccount } from "@/app/register/actions";

export function RegisterForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  function submit(data: FormData) {
    setError("");
    if (data.get("password") !== data.get("confirmation")) {
      setError("비밀번호 확인이 일치하지 않습니다."); return;
    }
    data.delete("confirmation");
    startTransition(async () => {
      try {
        const result = await registerAccount(data);
        setError(result.error ?? ""); setSuccess(!!result.success);
      } catch { setError("가입 요청에 실패했습니다. 다시 시도해 주세요."); }
    });
  }
  if (success) return <div className="mt-8 space-y-4" role="status">
    <p>계정이 생성되었습니다. 등록한 이메일과 비밀번호로 로그인하세요.</p>
    <Link href="/login" className="font-semibold text-blue-700 underline">로그인하기</Link>
  </div>;
  return <form onSubmit={(event) => {
    event.preventDefault();
    submit(new FormData(event.currentTarget));
  }} className="mt-8 space-y-4">
    {[
      { name: "name", label: "이름", type: "text", autoComplete: "name", max: 100 },
      { name: "email", label: "이메일", type: "email", autoComplete: "email", max: 254 },
      { name: "password", label: "비밀번호", type: "password", autoComplete: "new-password", max: 128 },
      { name: "confirmation", label: "비밀번호 확인", type: "password", autoComplete: "new-password", max: 128 },
    ].map((field) => <div key={field.name}>
      <label htmlFor={field.name} className="mb-2 block text-sm font-medium">{field.label}</label>
      <input {...{ name: field.name, id: field.name, type: field.type, autoComplete: field.autoComplete }} maxLength={field.max} required className="w-full rounded-xl border border-slate-300 px-4 py-3" />
    </div>)}
    <p className="text-sm text-slate-600">비밀번호는 12자 이상, 대문자·소문자·숫자·특수문자를 포함해 주세요.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button disabled={pending} className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white disabled:opacity-60">{pending ? "가입 중…" : "계정 만들기"}</button>
  </form>;
}
