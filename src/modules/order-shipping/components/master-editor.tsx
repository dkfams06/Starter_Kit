"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/crud/page-header";
import { ErrorState } from "@/components/crud/async-state";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { masterFields, masterLabels, type MasterKind, type MasterRecord } from "./master-fields";

export function MasterEditor({ kind, item, canEdit }: { kind: MasterKind; item?: MasterRecord; canEdit: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const label = masterLabels[kind];
  const endpoint = `/api/${kind}${item ? `/${item.id}` : ""}`;

  async function mutate(method: string, data: unknown) {
    setPending(true); setError(""); setMessage("");
    try {
      const response = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error ?? "처리하지 못했습니다.");
      }
      if (method === "DELETE") { router.push(`/admin/${kind}`); router.refresh(); return; }
      const result = await response.json();
      if (!item) router.push(`/admin/${kind}/${result.item.id}`);
      else setMessage("저장했습니다.");
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "서버 연결을 확인해 주세요."); }
    finally { setPending(false); setConfirm(false); }
  }

  return <div className="space-y-6">
    <PageHeader title={`${label} ${item ? "상세" : "등록"}`} description={canEdit ? "코드는 영문·숫자·밑줄·하이픈으로 입력하세요." : "기준정보는 조회만 가능합니다. 변경은 관리자에게 요청하세요."} />
    <Link className="inline-block text-sm text-blue-700 underline" href={`/admin/${kind}`}>목록으로</Link>
    {error && <ErrorState title="요청에 실패했습니다." description={error} />}
    {message && <p role="status" className="text-emerald-800">{message}</p>}
    <form onSubmit={event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const data: Record<string, string | boolean> = {};
      for (const field of masterFields[kind]) data[field.key] = String(form.get(field.key) ?? "");
      if (item) data.isActive = form.get("isActive") === "true";
      void mutate(item ? "PATCH" : "POST", data);
    }} className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-6">
      <fieldset disabled={!canEdit || pending} className="grid gap-5 sm:grid-cols-2">
        {masterFields[kind].map(field => <label key={field.key} className={`block text-sm font-medium ${field.type === "textarea" ? "sm:col-span-2" : ""}`}>
          {field.label}{field.required && " *"}
          {field.type === "textarea" ? <textarea name={field.key} maxLength={field.max} defaultValue={String(item?.[field.key] ?? "")} className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 p-3 disabled:bg-slate-50" /> :
            <input name={field.key} type={field.type ?? "text"} inputMode={field.decimal ? "decimal" : undefined} maxLength={field.max} required={field.required} defaultValue={String(item?.[field.key] ?? "")} className="mt-2 w-full rounded-lg border border-slate-300 p-3 disabled:bg-slate-50" />}
        </label>)}
        {item && <label className="block text-sm font-medium">상태<select name="isActive" defaultValue={String(item.isActive)} className="mt-2 w-full rounded-lg border border-slate-300 p-3"><option value="true">활성</option><option value="false">비활성</option></select></label>}
      </fieldset>
      {canEdit && <button disabled={pending} className="mt-6 rounded-lg bg-slate-900 px-5 py-2 font-semibold text-white disabled:opacity-60">{pending ? "처리 중…" : "저장"}</button>}
    </form>
    {canEdit && item && <section className="max-w-3xl rounded-2xl border border-red-200 p-6">
      <h2 className="font-semibold">삭제</h2>
      <p className="mt-2 text-sm text-slate-600">복구할 수 없는 작업입니다. 사용을 중단하려면 상태를 비활성으로 변경하세요.</p>
      <label className="mt-4 block text-sm">삭제 사유<input value={reason} onChange={e => setReason(e.target.value)} maxLength={500} className="mt-2 block w-full rounded-lg border border-slate-300 p-3" /></label>
      <button type="button" disabled={pending || !reason.trim()} onClick={() => setConfirm(true)} className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-white disabled:opacity-50">삭제</button>
    </section>}
    <ConfirmDialog open={confirm} title={`${label}를 삭제할까요?`} description={`코드 ${item?.code ?? ""} 항목을 삭제합니다. 사유는 감사 로그에 남습니다.`} confirmLabel="영구 삭제" pending={pending} onCancel={() => !pending && setConfirm(false)} onConfirm={() => void mutate("DELETE", { reason })} />
  </div>;
}
