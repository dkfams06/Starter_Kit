export type OrderOptions = {
  customers: { id: string; code: string; name: string; defaultAddress: string | null }[];
  products: { id: string; code: string; name: string; unit: string; defaultUnitPrice: string | null }[];
};
export type OrderView = {
  id: string; orderNo: string; status: "RECEIVED" | "CONFIRMED" | "SHIPPED" | "CANCELLED"; version: number;
  customerId: string; customerCodeSnapshot: string; customerNameSnapshot: string;
  shippingAddress: string; requestedShipDate: string | null; memo: string | null; totalAmount: string;
  firstConfirmedAt: string | null;
  items: { productId: string; productCodeSnapshot: string; productNameSnapshot: string; specificationSnapshot: string | null; unitSnapshot: string; quantity: string; unitPrice: string; lineAmount: string }[];
  shipment: { shippedAt: string; carrier: string | null; trackingNumber: string | null; memo: string | null } | null;
  history: { id: string; action: string; createdAt: string; actor: { name: string | null } | null; metadata: { reason?: string } | null }[];
};
export function previewTotal(lines: { quantity: string; unitPrice: string }[]) {
  try {
    let cents = BigInt(0);
    for (const line of lines) {
      if (!/^\d{1,11}(\.\d{1,3})?$/.test(line.quantity) || !/^\d{1,12}(\.\d{1,2})?$/.test(line.unitPrice)) return "—";
      const [q, qf = ""] = line.quantity.split("."), [p, pf = ""] = line.unitPrice.split(".");
      cents += (BigInt(q + qf.padEnd(3, "0")) * BigInt(p + pf.padEnd(2, "0")) + BigInt(500)) / BigInt(1000);
    }
    return `${cents / BigInt(100)}.${String(cents % BigInt(100)).padStart(2, "0")}`;
  } catch { return "—"; }
}
