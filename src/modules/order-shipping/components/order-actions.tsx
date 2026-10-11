"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { ErrorState } from "@/components/crud/async-state";
import type { OrderView } from "./order-types";
import type { OrderAction } from "../order-policy";
const labels = { confirm: "주문 확인", "revert-confirmation": "확인 취소", cancel: "주문 취소", ship: "전체 출고", delete: "주문 삭제" };
export function OrderActions({ order, isAdmin }: { order: OrderView; isAdmin: boolean }) {
  const router = useRouter();
  const [action, setAction] = useState<Exclude<OrderAction, "update"> | null>(null);
  const [reason, setReason] = useState(""), [carrier, setCarrier] = useState(""), [trackingNumber, setTracking] = useState(""), [memo, setMemo] = useState("");
  const [pending, setPending] = useState(false), [error, setError] = useState("");
  const allowed: Exclude<OrderAction, "update">[] = order.status === "RECEIVED"
    ? ["confirm", "cancel", ...(isAdmin && !order.firstConfirmedAt ? ["delete" as const] : [])]
    : order.status === "CONFIRMED" ? ["ship", ...(isAdmin ? ["revert-confirmation" as const, "cancel" as const] : [])] : [];
  if (!allowed.length) return <p className="rounded-xl bg-slate-100 p-4">처리가 완료된 주문입니다. 변경할 수 없습니다.</p>;
  return <section className="space-y-4 rounded-2xl border bg-white p-5">
    <h2 className="text-lg font-semibold">상태 처리</h2>
    {error && <ErrorState title="처리 실패" description={error} />}
    <label className="block text-sm">처리 사유 (취소·확인 취소·삭제 필수)<input maxLength={500} value={reason} onChange={e => setReason(e.target.value)} className="mt-1 block w-full rounded-lg border p-2" /></label>
    {order.status === "CONFIRMED" && <div className="grid gap-3 sm:grid-cols-3">
      <label>운송사<input value={carrier} maxLength={100} onChange={e => setCarrier(e.target.value)} className="mt-1 block w-full rounded-lg border p-2" /></label>
      <label>송장번호<input value={trackingNumber} maxLength={100} onChange={e => setTracking(e.target.value)} className="mt-1 block w-full rounded-lg border p-2" /></label>
      <label>출고 메모<input value={memo} maxLength={1000} onChange={e => setMemo(e.target.value)} className="mt-1 block w-full rounded-lg border p-2" /></label>
    </div>}
    <div className="flex flex-wrap gap-2">{allowed.map(a => <button key={a} type="button" disabled={pending} className="rounded-lg border border-slate-400 px-4 py-2" onClick={() => { if (["delete", "cancel", "revert-confirmation"].includes(a) && !reason.trim()) { setError("처리 사유를 입력하세요."); return; } setError(""); setAction(a); }}>{labels[a]}</button>)}</div>
    <ConfirmDialog open={action !== null} title={action ? `${labels[action]}할까요?` : ""} description={action === "ship" ? "모든 품목을 한 번에 출고합니다. 완료 후 수정하거나 되돌릴 수 없습니다." : "현재 버전과 권한을 서버에서 다시 확인한 뒤 처리합니다."} confirmLabel="처리 실행" pending={pending} onCancel={() => !pending && setAction(null)} onConfirm={async () => {
      if (!action || pending) return; setPending(true);
      try {
        const response = await fetch(`/api/orders/${order.id}${action === "delete" ? "" : `/${action}`}`, { method: action === "delete" ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version: order.version, ...(action === "ship" ? { carrier, trackingNumber, memo } : action === "confirm" ? {} : { reason }) }) });
        if (!response.ok) throw new Error((await response.json()).error);
        if (action === "delete") router.push("/admin/orders");
        router.refresh();
      } catch (e) { setError(e instanceof Error ? e.message : "처리하지 못했습니다."); }
      finally { setPending(false); setAction(null); }
    }} />
  </section>;
}
