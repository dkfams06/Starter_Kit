"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorState } from "@/components/crud/async-state";
import { previewTotal, type OrderOptions, type OrderView } from "./order-types";

const inputStyle = "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 disabled:bg-slate-100";
export function OrderEditor({ options, order }: { options: OrderOptions; order?: OrderView }) {
  const router = useRouter();
  const [customerId, setCustomer] = useState(order?.customerId ?? "");
  const [address, setAddress] = useState(order?.shippingAddress ?? "");
  const [lines, setLines] = useState(order?.items.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })) ?? [{ productId: "", quantity: "1", unitPrice: "0" }]);
  const [pending, setPending] = useState(false), [error, setError] = useState("");
  const editable = !order || order.status === "RECEIVED";
  const customers = [...options.customers];
  if (order) {
    const index = customers.findIndex(c => c.id === order.customerId);
    if (index >= 0) customers[index] = { ...customers[index], code: order.customerCodeSnapshot, name: order.customerNameSnapshot };
  }
  if (order && !customers.some(c => c.id === order.customerId)) customers.push({ id: order.customerId, code: order.customerCodeSnapshot, name: `${order.customerNameSnapshot} (비활성)`, defaultAddress: order.shippingAddress });
  const products = [...options.products];
  for (const item of order?.items ?? []) {
    const index = products.findIndex(p => p.id === item.productId);
    if (index >= 0) products[index] = { ...products[index], code: item.productCodeSnapshot, name: item.productNameSnapshot, unit: item.unitSnapshot };
  }
  for (const item of order?.items ?? []) if (!products.some(p => p.id === item.productId)) products.push({ id: item.productId, code: item.productCodeSnapshot, name: `${item.productNameSnapshot} (비활성)`, unit: item.unitSnapshot, defaultUnitPrice: item.unitPrice });
  function changeLine(index: number, patch: Partial<typeof lines[number]>) { setLines(current => current.map((line, i) => i === index ? { ...line, ...patch } : line)); }
  return <form className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5" onSubmit={async event => {
    event.preventDefault(); if (!editable || pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/orders${order ? `/${order.id}` : ""}`, { method: order ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId, shippingAddress: address, requestedShipDate: String(form.get("requestedShipDate") ?? ""), memo: String(form.get("memo") ?? ""), items: lines, ...(order ? { version: order.version } : {}) }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      if (!order) router.push(`/admin/orders/${result.item.id}`);
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했습니다."); }
    finally { setPending(false); }
  }}>
    {error && <ErrorState title="주문 저장 실패" description={error} />}
    <fieldset disabled={!editable || pending} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label>거래처<select aria-label="거래처" required value={customerId} onChange={e => { setCustomer(e.target.value); setAddress(customers.find(c => c.id === e.target.value)?.defaultAddress ?? ""); }} className={inputStyle}><option value="">거래처 선택</option>{customers.map(c => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}</select></label>
        <label>요청 출고일<input name="requestedShipDate" type="date" defaultValue={order?.requestedShipDate?.slice(0, 10) ?? ""} className={inputStyle} /></label>
      </div>
      <label className="block">배송지<input required maxLength={500} value={address} onChange={e => setAddress(e.target.value)} className={inputStyle} /></label>
      <div className="space-y-3" aria-label="주문 품목">
        {lines.map((line, index) => <div key={index} className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-4">
          <label>품목 {index + 1}<select aria-label={`품목 ${index + 1}`} required value={line.productId} className={inputStyle} onChange={e => changeLine(index, { productId: e.target.value, unitPrice: products.find(p => p.id === e.target.value)?.defaultUnitPrice ?? "0" })}><option value="">품목 선택</option>{products.map(p => <option key={p.id} value={p.id}>{p.code} · {p.name} ({p.unit})</option>)}</select></label>
          <label>수량 {index + 1}<input required inputMode="decimal" maxLength={15} value={line.quantity} onChange={e => changeLine(index, { quantity: e.target.value })} className={inputStyle} /></label>
          <label>단가 {index + 1}<input required inputMode="decimal" maxLength={15} value={line.unitPrice} onChange={e => changeLine(index, { unitPrice: e.target.value })} className={inputStyle} /></label>
          <div className="self-end"><p className="text-sm">금액 {previewTotal([line])} 원</p>{editable && <button type="button" disabled={lines.length === 1} onClick={() => setLines(current => current.filter((_, i) => i !== index))} className="mt-2 text-sm text-red-700 disabled:opacity-40" aria-label={`품목 ${index + 1} 제거`}>행 제거</button>}</div>
          {order?.items.find(item => item.productId === line.productId)?.specificationSnapshot && <p className="text-sm text-slate-500 sm:col-span-4">주문 당시 규격: {order.items.find(item => item.productId === line.productId)?.specificationSnapshot}</p>}
        </div>)}
      </div>
      {editable && <button type="button" disabled={lines.length >= 50} className="rounded-lg border px-4 py-2" onClick={() => setLines(current => [...current, { productId: "", quantity: "1", unitPrice: "0" }])}>품목 추가</button>}
      <label className="block">주문 메모<textarea name="memo" defaultValue={order?.memo ?? ""} maxLength={2000} className={inputStyle} /></label>
    </fieldset>
    <p className="text-lg font-semibold" role="status">합계 {previewTotal(lines)} 원</p>
    <p className="text-sm text-slate-500">수량은 소수 3자리, 단가는 소수 2자리까지 입력합니다. 품목별 금액을 반올림한 뒤 합산하며 최종 금액은 서버에서 검증합니다.</p>
    {editable && <button disabled={pending} className="rounded-lg bg-slate-900 px-5 py-2 text-white disabled:opacity-50">{pending ? "저장 중…" : order ? "주문 수정 저장" : "주문 접수"}</button>}
  </form>;
}
