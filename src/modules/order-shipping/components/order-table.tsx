"use client";
import Link from "next/link";
import { DataTable } from "@/components/crud/data-table";
import { statusLabels } from "../order-validation";
export function OrderTable({ items }: { items: { id: string; orderNo: string; customerNameSnapshot: string; status: keyof typeof statusLabels; totalAmount: string; orderedAt: string }[] }) {
  return <DataTable rows={items} getRowKey={row => row.id} emptyTitle="조회된 주문이 없습니다." columns={[
    { key: "orderNo", header: "주문번호", cell: row => <Link className="font-semibold text-blue-700 underline" href={`/admin/orders/${row.id}`}>{row.orderNo}</Link> },
    { key: "customer", header: "거래처", cell: row => row.customerNameSnapshot },
    { key: "status", header: "상태", cell: row => statusLabels[row.status] },
    { key: "total", header: "합계 (원)", cell: row => row.totalAmount },
    { key: "date", header: "접수일", cell: row => new Date(row.orderedAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }) },
  ]} />;
}
