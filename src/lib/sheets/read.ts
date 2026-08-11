import "server-only";
import { getSheetsClient } from "./client";

/** Reads a tab as an array of header-keyed row objects. */
export async function readRowsByHeader(spreadsheetId: string, tab: string): Promise<Record<string, string>[]> {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: tab });
  const rows = res.data.values ?? [];
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => String(h).trim());
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => (obj[h] = String(row[i] ?? "")));
    return obj;
  });
}
