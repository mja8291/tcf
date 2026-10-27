import "server-only";
import { readRowsByHeader } from "@/lib/sheets/read";
import { METHOD1_ITEMS } from "@/lib/data/method1-items";
import { METHOD2_GROUPS } from "@/lib/data/method2-items";
import { LEGACY_METHOD1_ITEMS } from "@/lib/data/method1-legacy-items";
import { LEGACY_METHOD2_GROUPS } from "@/lib/data/method2-legacy-items";
import { METHOD2_GROUPS_20261027 } from "@/lib/data/method2-v20261027-items";
import { aggregateMethod2, ratingBand } from "@/lib/scoring";
import type { Condition, Method2Location, RubricItem } from "@/lib/types";

const METHOD1_TAB = process.env.METHOD1_RESPONSE_TAB || "Method 1 Responses";
const METHOD2_TAB = process.env.METHOD2_RESPONSE_TAB || "Method 2 Responses";

export interface FoundSurvey {
  method: 1 | 2;
  campusName: string;
  region: string;
  area: string;
  submittedAt: string;
  apm: string;
  asm: string;
  principal: string;
  powerSupply: string;
  structuralConcern: string;
  buildingStructure: string;
  typeOfStructure: string;
  centerBeam: string;
  complaints: string;
  overall: number | null;
  functionality: number | null;
  safety: number | null;
  aesthetics: number | null;
  ratingBandLabel: string;
  /** ISO timestamp set when the method was chosen, or "" if never recorded (older rows predate this column). */
  startTime: string;
  /** ISO timestamp of submission — falls back to submittedAt (the sheet's own Timestamp column) if the dedicated End Time column is blank. */
  endTime: string;
  timeTakenSeconds: number | null;
  /** Item name -> condition string (Method 1) or "" (Method 2, use aggregatedScores instead). */
  conditions: Record<string, string>;
  /** Method 2 only — campus-level aggregated score (0-100) per item group. */
  aggregatedScores?: Record<string, number>;
  items: RubricItem[];
}

function num(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

/** Looks up a submitted survey by Survey ID across both response tabs, for the Excel/PDF export routes. */
export async function findSurvey(spreadsheetId: string, surveyId: string): Promise<FoundSurvey | null> {
  const m1Rows = await readRowsByHeader(spreadsheetId, METHOD1_TAB).catch(() => []);
  const m1Row = m1Rows.find((r) => r["Survey ID"] === surveyId);
  if (m1Row) {
    // A row with no Rubric Version predates the 2026-10-27 item lists (see
    // rubric-version.ts) and was scored against the frozen legacy ones —
    // exporting it with today's names/weights would recalculate a different
    // score than the one that was submitted.
    const m1Items = m1Row["Rubric Version"] ? METHOD1_ITEMS : LEGACY_METHOD1_ITEMS;
    const conditions: Record<string, string> = {};
    for (const item of m1Items) conditions[item.name] = m1Row[item.name] ?? "";
    const overall = num(m1Row["Overall Score"]);
    return {
      method: 1,
      campusName: m1Row["Campus Name"] ?? "",
      region: m1Row["Region"] ?? "",
      area: m1Row["Area"] ?? "",
      submittedAt: m1Row["Timestamp"] ?? "",
      apm: m1Row["Accompanying APM"] ?? "",
      asm: m1Row["Responding ASM"] ?? "",
      principal: m1Row["School Principal"] ?? "",
      powerSupply: m1Row["Power Supply"] ?? "",
      structuralConcern: m1Row["Structural Concern Observed"] ?? "",
      buildingStructure: m1Row["Suggested Structural Type"] ?? "",
      typeOfStructure: m1Row["Type of Structure (Visual Inspection)"] ?? "",
      centerBeam: m1Row["Center Beam in Classrooms"] ?? "",
      complaints: m1Row["Major Complaints"] ?? "",
      overall,
      functionality: num(m1Row["Functionality Score"]),
      safety: num(m1Row["Safety Score"]),
      aesthetics: num(m1Row["Aesthetics Score"]),
      ratingBandLabel: m1Row["Rating Band"] || ratingBand(overall) || "",
      startTime: m1Row["Start Time"] ?? "",
      endTime: m1Row["End Time"] || m1Row["Timestamp"] || "",
      timeTakenSeconds: num(m1Row["Time Taken (seconds)"]),
      conditions,
      items: m1Items,
    };
  }

  const m2Rows = await readRowsByHeader(spreadsheetId, METHOD2_TAB).catch(() => []);
  const locationRows = m2Rows.filter((r) => r["Survey ID"] === surveyId);
  if (locationRows.length === 0) return null;

  // Same version check as Method 1 above, with one more step for Method 2:
  // no version = the original 45 per-item columns; "2026-10-27" = the first
  // 30-group list (before Internal Flooring and the reweighting); anything
  // newer = the current list. Method 1's list didn't change between those
  // last two, so it needs no equivalent branch.
  const m2Version = locationRows[0]["Rubric Version"];
  const groups = !m2Version ? LEGACY_METHOD2_GROUPS : m2Version === "2026-10-27" ? METHOD2_GROUPS_20261027 : METHOD2_GROUPS;
  const locations: Method2Location[] = locationRows.map((row, i) => {
    const scores: Record<string, Condition> = {};
    for (const group of groups) {
      const value = row[group.name];
      if (value) scores[group.name] = value as Condition;
    }
    return {
      id: String(i),
      floorLevel: (row["Floor Level"] as Method2Location["floorLevel"]) ?? "Ground",
      type: (row["Location Type"] as Method2Location["type"]) ?? "Classroom",
      name: row["Location Name"] ?? "",
      scores,
      photos: {},
      notes: {},
    };
  });

  const first = locationRows[0];
  const overall = num(first["Overall Score"]);
  return {
    method: 2,
    campusName: first["Campus Name"] ?? "",
    region: first["Region"] ?? "",
    area: first["Area"] ?? "",
    submittedAt: first["Timestamp"] ?? "",
    apm: first["Accompanying APM"] ?? "",
    asm: first["Responding ASM"] ?? "",
    principal: first["School Principal"] ?? "",
    powerSupply: first["Power Supply"] ?? "",
    structuralConcern: first["Structural Concern Observed"] ?? "",
    buildingStructure: first["Suggested Structural Type"] ?? "",
    typeOfStructure: first["Type of Structure (Visual Inspection)"] ?? "",
    centerBeam: first["Center Beam in Classrooms"] ?? "",
    complaints: first["Major Complaints"] ?? "",
    overall,
    functionality: num(first["Functionality Score"]),
    safety: num(first["Safety Score"]),
    aesthetics: num(first["Aesthetics Score"]),
    ratingBandLabel: first["Rating Band"] || ratingBand(overall) || "",
    startTime: first["Start Time"] ?? "",
    endTime: first["End Time"] || first["Timestamp"] || "",
    timeTakenSeconds: num(first["Time Taken (seconds)"]),
    conditions: {},
    aggregatedScores: aggregateMethod2(locations, groups),
    items: groups,
  };
}
