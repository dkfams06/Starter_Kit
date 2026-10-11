"use client";
import { useState } from "react";
export function ExportButton({ query }: { query: string }) {
  const [pending, setPending] = useState(false), [error, setError] = useState("");
  return <div><button disabled={pending} className="rounded-lg border px-4 py-2" onClick={async () => {
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/orders/export?${query}`);
      if (!response.ok) throw new Error((await response.json()).error);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = "orders.xlsx"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) { setError(e instanceof Error ? e.message : "다운로드 실패"); }
    finally { setPending(false); }
  }}>{pending ? "생성 중…" : "Excel 다운로드"}</button>{error && <p role="alert" className="text-red-700">{error}</p>}</div>;
}
