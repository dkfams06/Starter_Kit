"use client";

import Link from "next/link";
import { DataTable } from "@/components/crud/data-table";
import { masterLabels, type MasterKind, type MasterRecord } from "./master-fields";

export function MasterTable({ kind, items }: { kind: MasterKind; items: MasterRecord[] }) {
  return <DataTable rows={items} getRowKey={row => row.id} emptyTitle={`조회된 ${masterLabels[kind]}가 없습니다.`} columns={[
    { key: "code", header: "코드", cell: row => row.code },
    { key: "name", header: "명칭", cell: row => <Link href={`/admin/${kind}/${row.id}`} className="font-semibold text-blue-700 underline">{row.name}</Link> },
    ...(kind === "products" ? [
      { key: "unit", header: "단위", cell: (row: MasterRecord) => String(row.unit) },
      { key: "price", header: "기준 단가 (원)", cell: (row: MasterRecord) => row.defaultUnitPrice === null ? "미설정" : String(row.defaultUnitPrice) },
    ] : [{ key: "contact", header: "담당자", cell: (row: MasterRecord) => String(row.contactName ?? "—") }]),
    { key: "active", header: "상태", cell: row => <span className={`rounded-full px-3 py-1 text-xs ${row.isActive ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{row.isActive ? "활성" : "비활성"}</span> },
  ]} />;
}
