import Link from "next/link";
import { notFound } from "next/navigation";
import { isDemoEnabled } from "@/lib/auth/demo-policy";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  if (!isDemoEnabled()) notFound();
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
    <h1 className="text-3xl font-bold">체험 계정 만들기</h1>
    <p className="mt-3 text-sm text-slate-600">일반 사용자로 가입합니다. 업무 데이터는 다른 방문자와 공유됩니다. 실제 개인정보나 업무 자료를 입력하지 마세요. 이메일 인증·비밀번호 복구는 제공하지 않습니다.</p>
    <RegisterForm />
    <Link href="/login" className="mt-6 text-sm underline">로그인으로 돌아가기</Link>
  </main>;
}
