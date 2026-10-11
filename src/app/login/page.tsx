import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
        Work Management
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight">로그인</h1>
      <p className="mt-3 text-slate-600">
        관리자가 발급한 계정으로만 로그인할 수 있습니다.
      </p>
      <LoginForm />
    </main>
  );
}
