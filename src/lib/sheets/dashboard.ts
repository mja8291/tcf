import "server-only";
import { sheetsConfigured } from "./client";
import { getSchools } from "./schools";
import { readRowsByHeader } from "./read";
import { CRITICAL_ITEMS, ratingBand } from "@/lib/scoring";
import type { RatingBand } from "@/lib/types";
import { MOCK_CAPTURED_SCHOOLS, type CapturedSchool } from "@/lib/data/mock-dashboard";

export interface DashboardData {
  totalSchools: number;
  captured: number;
  pending: number;
  averageScore: number | null;
  overallBand: RatingBand | null;
  averageMajorScore: number | null;
  averageMinorScore: number | null;
  /** Campus-average score per critical-item watchlist entry, across captured schools that have a value for it. */
  criticalItemAverages: Record<string, number | null>;
  distribution: Record<RatingBand, number>;
  byRegion: { region: string; average: number; count: number }[];
  schools: CapturedSchool[];
}

const METHOD1_TAB = process.env.METHOD1_RESPONSE_TAB || "Method 1 Responses";
const METHOD2_TAB = process.env.METHOD2_RESPONSE_TAB || "Method 2 Responses";

let cache: { data: DashboardData; fetchedAt: number } | null = null;
const CACHE_MS = 5 * 60 * 1000;

export async function getDashboardData(): Promise<DashboardData> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) return cache.data;

  const allSchools = await getSchools();
  let captured: CapturedSchool[];

  if (sheetsConfigured() && process.env.MQI_SPREADSHEET_ID) {
    const spreadsheetId = process.env.MQI_SPREADSHEET_ID;
    const [m1Rows, m2Rows] = await Promise.all([
      readRowsByHeader(spreadsheetId, METHOD1_TAB).catch(() => []),
      readRowsByHeader(spreadsheetId, METHOD2_TAB).catch(() => []),
    ]);

    const fromM1 = m1Rows.map((r) => rowToCaptured(r, 1)).filter((s): s is CapturedSchool => s !== null);

    // Method 2 writes one row per location with the campus-level score repeated
    // on every row (see appendMethod2Response) — one row per Survey ID is the
    // campus rollup, so dedupe on Survey ID before merging.
    const seenSurveyIds = new Set<string>();
    const fromM2: CapturedSchool[] = [];
    for (const r of m2Rows) {
      const surveyId = r["Survey ID"];
      if (surveyId && seenSurveyIds.has(surveyId)) continue;
      if (surveyId) seenSurveyIds.add(surveyId);
      const s = rowToCaptured(r, 2);
      if (s) fromM2.push(s);
    }

    // Dashboard shows current state only — keep the most recent submission per school.
    const bySchool = new Map<string, CapturedSchool>();
    for (const s of [...fromM1, ...fromM2]) {
      const existing = bySchool.get(s.schoolId);
      if (!existing || s.date > existing.date) bySchool.set(s.schoolId, s);
    }
    captured = [...bySchool.values()];
  } else {
    captured = MOCK_CAPTURED_SCHOOLS;
  }

  const data = summarize(allSchools.length, captured);
  cache = { data, fetchedAt: Date.now() };
  return data;
}

function num(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function rowToCaptured(r: Record<string, string>, method: 1 | 2): CapturedSchool | null {
  const overallRaw = r["Overall Score"];
  const overall = overallRaw ? Number(overallRaw) : NaN;
  if (!r["School ID"] || Number.isNaN(overall)) return null;
  const criticalItems: Record<string, number | null> = {};
  for (const name of CRITICAL_ITEMS) criticalItems[name] = num(r[`Critical: ${name}`]);
  return {
    schoolId: r["School ID"],
    surveyId: r["Survey ID"] || "",
    name: r["Campus Name"] || r["School ID"],
    region: r["Region"] || "",
    area: r["Area"] || "",
    method,
    date: r["Timestamp"] || "",
    overall,
    band: (r["Rating Band"] as RatingBand) || ratingBand(overall) || "Poor",
    major: num(r["Major Score"]),
    minor: num(r["Minor Score"]),
    criticalItems,
  };
}

/** Average of whichever values aren't null — not the same as dividing by captured.length, since not every survey has every value (e.g. Major/Minor on rows written before this feature). */
function averageOf(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null);
  return present.length ? present.reduce((a, b) => a + b, 0) / present.length : null;
}

function summarize(totalSchools: number, captured: CapturedSchool[]): DashboardData {
  const distribution: Record<RatingBand, number> = { Excellent: 0, Good: 0, Average: 0, Poor: 0 };
  for (const s of captured) distribution[s.band]++;

  const averageScore = captured.length ? captured.reduce((sum, s) => sum + s.overall, 0) / captured.length : null;
  const averageMajorScore = averageOf(captured.map((s) => s.major));
  const averageMinorScore = averageOf(captured.map((s) => s.minor));

  const criticalItemAverages: Record<string, number | null> = {};
  for (const name of CRITICAL_ITEMS) {
    criticalItemAverages[name] = averageOf(captured.map((s) => s.criticalItems[name] ?? null));
  }

  const regionMap = new Map<string, { total: number; count: number }>();
  for (const s of captured) {
    const entry = regionMap.get(s.region) ?? { total: 0, count: 0 };
    entry.total += s.overall;
    entry.count += 1;
    regionMap.set(s.region, entry);
  }
  const byRegion = [...regionMap.entries()]
    .map(([region, { total, count }]) => ({ region, average: total / count, count }))
    .sort((a, b) => a.region.localeCompare(b.region));

  return {
    totalSchools: Math.max(totalSchools, captured.length),
    captured: captured.length,
    pending: Math.max(totalSchools, captured.length) - captured.length,
    averageScore,
    overallBand: ratingBand(averageScore),
    averageMajorScore,
    averageMinorScore,
    criticalItemAverages,
    distribution,
    byRegion,
    schools: [...captured].sort((a, b) => b.date.localeCompare(a.date)),
  };
}
