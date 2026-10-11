export type MasterKind = "customers" | "products";
export type MasterRecord = { id: string; code: string; name: string; isActive: boolean; [key: string]: string | boolean | null };
export type MasterField = { key: string; label: string; required?: boolean; max: number; type?: "email" | "textarea"; decimal?: boolean };
export const masterLabels = { customers: "거래처", products: "품목" };
const common: MasterField[] = [
  { key: "code", label: "코드", required: true, max: 40 },
  { key: "name", label: "명칭", required: true, max: 120 },
];
export const masterFields: Record<MasterKind, MasterField[]> = {
  customers: [...common,
    { key: "businessNumber", label: "사업자번호", max: 30 },
    { key: "contactName", label: "담당자", max: 100 },
    { key: "phone", label: "전화번호", max: 40 },
    { key: "email", label: "이메일", max: 254, type: "email" },
    { key: "defaultAddress", label: "기본 배송지", max: 500 },
    { key: "memo", label: "메모", max: 2000, type: "textarea" },
  ],
  products: [...common,
    { key: "specification", label: "규격", max: 200 },
    { key: "unit", label: "단위", required: true, max: 20 },
    { key: "defaultUnitPrice", label: "기준 단가 (원)", max: 15, decimal: true },
    { key: "memo", label: "메모", max: 2000, type: "textarea" },
  ],
};
