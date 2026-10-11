import ExcelJS from "exceljs";
export type ExportCell = string | number | Date | null;
export const exportHeaders = ["주문번호", "상태", "주문일", "거래처 코드", "거래처명", "품목 코드", "품목명", "규격", "단위", "수량", "단가", "금액", "요청 출고일", "실제 출고일", "운송사", "송장번호", "접수자", "확인자", "출고자"];
export function safeExcelText(value: string) {
  // Explicit text cells, plus escape formula-like prefixes for downstream copying.
  return /^[\s\u0000-\u001f]*[=+@-]/.test(value) ? `'${value}` : value;
}
export async function buildOrderWorkbook(rows: ExportCell[][]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("주문", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = exportHeaders.map(header => ({ header, width: 20 }));
  sheet.getRow(1).font = { bold: true };
  for (const cells of rows) sheet.addRow(cells.map(v => typeof v === "string" ? safeExcelText(v) : v));
  for (const i of [3, 13, 14]) sheet.getColumn(i).numFmt = "yyyy-mm-dd";
  sheet.getColumn(10).numFmt = "#,##0.000";
  for (const i of [11, 12]) sheet.getColumn(i).numFmt = "#,##0.00";
  sheet.autoFilter = { from: "A1", to: "S1" };
  return workbook.xlsx.writeBuffer();
}
