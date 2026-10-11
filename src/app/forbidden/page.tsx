import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-700">
        403 Forbidden
      </p>
      <h1 className="mt-3 text-4xl font-bold">접근 권한이 없습니다.</h1>
      <p className="mt-4 text-slate-600">관리자 권한이 필요한 화면입니다.</p>
      <Link className="mt-8 font-semibold underline" href="/">
        홈으로 돌아가기
      </Link>
    </main>
  );
}
