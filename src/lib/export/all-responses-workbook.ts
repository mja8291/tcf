import "server-only";
import ExcelJS from "exceljs";

function addSheet(wb: ExcelJS.Workbook, name: string, rows: Record<string, string>[]) {
  const sheet = wb.addWorksheet(name);
  if (rows.length === 0) {
    sheet.addRow(["No responses yet"]);
    return;
  }
  const headers = Object.keys(rows[0]);
  sheet.columns = headers.map((h) => ({ header: h, key: h, width: Math.min(Math.max(h.length, 12), 40) }));
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) sheet.addRow(headers.map((h) => row[h] ?? ""));
}

/** Every submitted survey/location row, matching the Response sheets' own columns — one shape, no reinterpretation. */
export function buildAllResponsesWorkbook(method1Rows: Record<string, string>[], method2Rows: Record<string, string>[]): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  addSheet(wb, "Method 1 Responses", method1Rows);
  addSheet(wb, "Method 2 Responses", method2Rows);
  return wb;
}
