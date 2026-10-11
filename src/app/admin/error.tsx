"use client";

import { ErrorState } from "@/components/crud/async-state";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="space-y-4">
      <ErrorState description="잠시 후 다시 시도해 주세요." title="화면을 불러오지 못했습니다." />
      <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={reset} type="button">다시 시도</button>
    </div>
  );
}
