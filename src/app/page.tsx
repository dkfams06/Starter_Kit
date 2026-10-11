import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
        Work Management
      </p>
      <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
        Starter Kit
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
        Next.js, TypeScript, Prisma, PostgreSQL 기반의 업무관리 서비스 초기
        환경입니다.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          ["App", "Next.js 16 / Port 3002"],
          ["Database", "PostgreSQL / Port 5433"],
          ["Auth", "Auth.js 연결 준비됨"],
        ].map(([label, value]) => (
          <section
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            key={label}
          >
            <h2 className="text-sm font-medium text-slate-500">{label}</h2>
            <p className="mt-2 font-semibold text-slate-900">{value}</p>
          </section>
        ))}
      </div>
      <div className="mt-8 flex gap-3">
        <Link
          className="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white"
          href="/login"
        >
          로그인
        </Link>
        <Link
          className="rounded-xl border border-slate-300 px-5 py-3 font-semibold"
          href="/admin/users"
        >
          사용자 관리
        </Link>
      </div>
    </main>
  );
}
