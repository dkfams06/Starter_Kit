import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";
import { DemoButton } from "@/components/auth/demo-button";
import { isDemoEnabled } from "@/lib/auth/demo-policy";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
        Work Management
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight">로그인</h1>
      <p className="mt-3 text-slate-600">
        {isDemoEnabled() ? "가입 없이 둘러보거나, 체험 계정을 만들어 로그인하세요." : "관리자가 발급한 계정으로 로그인하세요."}
      </p>
      {isDemoEnabled() && <DemoButton />}
      <LoginForm />
      {isDemoEnabled() && <Link href="/register" className="mt-6 text-center font-medium text-blue-700 underline">체험 계정 만들기</Link>}
    </main>
  );
}
