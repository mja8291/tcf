import "server-only";
import { getSheetsClient, sheetsConfigured } from "./client";
import { MOCK_SCHOOLS } from "@/lib/data/mock-schools";
import type { School } from "@/lib/types";

let cache: { data: School[]; fetchedAt: number } | null = null;
const CACHE_MS = 5 * 60 * 1000;

/**
 * Reads the campus list by header name (not fixed columns) so the picker stays
 * correct if the source sheet's column order changes. No sheet in Drive is
 * literally named "SMS" — defaults target "Schools_Standardized" /
 * "Schools (All Units)" (Region/Area/Campus/Campus ID/Unit Status columns,
 * one row per Primary/Secondary/etc. unit — deduped here to one row per
 * campus via Campus ID). Confirm this is the intended source before relying
 * on it; override via SCHOOLS_SPREADSHEET_ID / SCHOOLS_SHEET_TAB otherwise.
 */
export async function getSchools(): Promise<School[]> {
  if (!sheetsConfigured() || !process.env.SCHOOLS_SPREADSHEET_ID) {
    return MOCK_SCHOOLS;
  }
  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) {
    return cache.data;
  }

  const tab = process.env.SCHOOLS_SHEET_TAB || "Schools (All Units)";
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SCHOOLS_SPREADSHEET_ID,
    range: tab,
  });

  const rows = res.data.values ?? [];
  if (rows.length < 2) return MOCK_SCHOOLS;

  const header = rows[0].map((h) => String(h).trim().toLowerCase());
  const colIndex = (...candidates: string[]) => {
    for (const c of candidates) {
      const idx = header.indexOf(c);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const regionCol = colIndex("region");
  const areaCol = colIndex("area");
  const nameCol = colIndex("campus", "school", "school name", "campus name");
  const idCol = colIndex("campus id", "school id", "schoolid");
  const statusCol = colIndex("unit status", "status");

  if (regionCol === -1 || areaCol === -1 || nameCol === -1 || idCol === -1) {
    return MOCK_SCHOOLS;
  }

  const seen = new Set<string>();
  const schools: School[] = [];
  for (const row of rows.slice(1)) {
    if (statusCol !== -1 && row[statusCol] && String(row[statusCol]).toLowerCase() !== "active") continue;
    const schoolId = String(row[idCol] ?? "").trim();
    const name = String(row[nameCol] ?? "").trim();
    if (!schoolId || !name || seen.has(schoolId)) continue;
    seen.add(schoolId);
    schools.push({
      schoolId,
      name,
      region: String(row[regionCol] ?? "").trim(),
      area: String(row[areaCol] ?? "").trim(),
    });
  }

  if (schools.length === 0) return MOCK_SCHOOLS;
  cache = { data: schools, fetchedAt: Date.now() };
  return schools;
}
