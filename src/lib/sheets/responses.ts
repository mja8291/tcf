import "server-only";
import { getSheetsClient } from "./client";
import { CRITICAL_ITEMS, ratingBand } from "@/lib/scoring";
import { METHOD1_ITEMS } from "@/lib/data/method1-items";
import { METHOD2_GROUPS } from "@/lib/data/method2-items";
import type { SubmitPayload } from "@/lib/submit";

/** Column name for a critical item's pre-aggregated summary value — distinct
 * from the item's own raw per-location column (same name as the rubric item)
 * so the two never collide in the header lookup. */
function criticalColumn(itemName: string): string {
  return `Critical: ${itemName}`;
}

const COMMON_HEADER = [
  "Survey ID",
  "Timestamp",
  "Campus Name",
  "School ID",
  "Region",
  "Area",
  "Responding ASM",
  "Accompanying APM",
  "School Principal",
  "Power Supply",
  "Location Name",
  "Major Complaints",
  "Overall Score",
  "Functionality Score",
  "Safety Score",
  "Aesthetics Score",
  "Rating Band",
  "Oath",
];

// Appended (not inserted) after the item columns, matching how they were
// added to the already-live "Method 1 Responses" / "Method 2 Responses"
// tabs — those existing sheets keep their original column order untouched,
// with anything new appended at the end (2026-08-12).
const TRAILING_HEADER = [
  "Major Score",
  "Minor Score",
  "Start Time",
  "End Time",
  "Time Taken (seconds)",
  ...CRITICAL_ITEMS.map(criticalColumn),
];

const METHOD1_HEADER = [...COMMON_HEADER, ...METHOD1_ITEMS.map((i) => i.name), ...TRAILING_HEADER];
const METHOD2_HEADER = [
  ...COMMON_HEADER,
  "Floor Level",
  "Location Type",
  "Classroom Grade",
  "Classroom Section",
  ...METHOD2_GROUPS.map((g) => g.name),
  ...TRAILING_HEADER,
];
const ATTACHMENTS_HEADER = ["Survey ID", "Item Name", "Location Name", "Photo URL", "Note"];

const ensuredTabs = new Set<string>();
const headerCache = new Map<string, string[]>();

/**
 * Makes sure `tab` exists on the spreadsheet, creating it (with `desiredHeader`
 * as its header row) if it doesn't. These response tabs are new — this app
 * replaces the old Form + static Sheet workflow — so there's nothing to
 * provision manually first. If the tab already exists, its real header is
 * left untouched and used as-is (someone may have reordered/renamed columns).
 */
async function ensureTab(spreadsheetId: string, tab: string, desiredHeader: string[]): Promise<void> {
  const cacheKey = `${spreadsheetId}/${tab}`;
  if (ensuredTabs.has(cacheKey)) return;

  const sheets = await getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties.title" });
  const exists = (meta.data.sheets ?? []).some((s) => s.properties?.title === tab);

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!1:1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [desiredHeader] },
    });
    headerCache.set(cacheKey, desiredHeader);
  } else {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tab}!1:1` });
    const existingHeader = (res.data.values?.[0] ?? []).map((h) => String(h).trim());
    if (existingHeader.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tab}!1:1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [desiredHeader] },
      });
      headerCache.set(cacheKey, desiredHeader);
    } else {
      headerCache.set(cacheKey, existingHeader);
    }
  }
  ensuredTabs.add(cacheKey);
}

async function getHeader(spreadsheetId: string, tab: string, desiredHeader: string[]): Promise<string[]> {
  const cacheKey = `${spreadsheetId}/${tab}`;
  await ensureTab(spreadsheetId, tab, desiredHeader);
  return headerCache.get(cacheKey) ?? desiredHeader;
}

/** Appends one row, mapping `fields` to columns by header name (case-insensitive) rather than fixed letters. */
async function appendRowByHeader(
  spreadsheetId: string,
  tab: string,
  desiredHeader: string[],
  fields: Record<string, string>
) {
  const header = await getHeader(spreadsheetId, tab, desiredHeader);
  const lower = header.map((h) => h.toLowerCase());
  const row = header.map((_, i) => {
    const key = Object.keys(fields).find((k) => k.toLowerCase() === lower[i]);
    return key ? fields[key] : "";
  });
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: tab,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
}

function requireSpreadsheetId(): string {
  const id = process.env.MQI_SPREADSHEET_ID;
  if (!id) throw new Error("MQI_SPREADSHEET_ID is not configured");
  return id;
}

const METHOD1_TAB = process.env.METHOD1_RESPONSE_TAB || "Method 1 Responses";
// "Method 2 Responses" now holds the v2 (44-item, floor/location/work-category)
// schema. The old 23-item-group tab was replaced on 2026-08-09 — its 19 rows
// were test data, confirmed with Junaid, and were deleted rather than migrated.
const METHOD2_TAB = process.env.METHOD2_RESPONSE_TAB || "Method 2 Responses";
const ATTACHMENTS_TAB = process.env.ATTACHMENTS_TAB || "MQI Survey Attachments";

function commonFields(payload: SubmitPayload, locationName = ""): Record<string, string> {
  const fields: Record<string, string> = {
    "Survey ID": payload.surveyId,
    Timestamp: new Date().toISOString(),
    "Campus Name": payload.school.name,
    "School ID": payload.school.schoolId,
    Region: payload.school.region,
    Area: payload.school.area,
    "Responding ASM": payload.asm,
    "Accompanying APM": payload.apm,
    "School Principal": payload.principal,
    "Power Supply": payload.powerSupply,
    "Location Name": locationName,
    "Major Complaints": payload.complaints,
    "Overall Score": payload.overall === null ? "" : String(Math.round(payload.overall)),
    "Functionality Score": payload.functionality === null ? "" : String(Math.round(payload.functionality)),
    "Safety Score": payload.safety === null ? "" : String(Math.round(payload.safety)),
    "Aesthetics Score": payload.aesthetics === null ? "" : String(Math.round(payload.aesthetics)),
    "Rating Band": ratingBand(payload.overall) ?? "",
    Oath: "Affirm",
    "Major Score": payload.major === null ? "" : String(Math.round(payload.major)),
    "Minor Score": payload.minor === null ? "" : String(Math.round(payload.minor)),
    "Start Time": payload.startTime ?? "",
    "End Time": payload.endTime ?? "",
    "Time Taken (seconds)": payload.timeTakenSeconds === null ? "" : String(payload.timeTakenSeconds),
  };
  for (const [name, score] of Object.entries(payload.criticalItems)) {
    fields[criticalColumn(name)] = score === null ? "" : String(Math.round(score));
  }
  return fields;
}

/** One row per submission — one column per Method 1 item, condition string as the value. */
export async function appendMethod1Response(payload: SubmitPayload) {
  const spreadsheetId = requireSpreadsheetId();
  const fields: Record<string, string> = { ...commonFields(payload) };
  for (const [itemName, condition] of Object.entries(payload.scores)) {
    fields[itemName] = condition;
  }
  await appendRowByHeader(spreadsheetId, METHOD1_TAB, METHOD1_HEADER, fields);
}

/**
 * One row per location. The campus-level overall/category scores (already
 * aggregated across every location at submission time) are repeated on every
 * row so the dashboard can read one row per Survey ID without re-running
 * aggregation itself.
 */
export async function appendMethod2Response(payload: SubmitPayload) {
  const spreadsheetId = requireSpreadsheetId();
  if (!payload.locations || payload.locations.length === 0) return;
  for (const loc of payload.locations) {
    const fields: Record<string, string> = {
      ...commonFields(payload, loc.name),
      "Floor Level": loc.floorLevel,
      "Location Type": loc.type,
      "Classroom Grade": loc.classroomGrade ?? "",
      "Classroom Section": loc.classroomSection ?? "",
    };
    for (const [itemName, condition] of Object.entries(loc.scores)) {
      fields[itemName] = condition;
    }
    await appendRowByHeader(spreadsheetId, METHOD2_TAB, METHOD2_HEADER, fields);
  }
}

export async function appendAttachmentRow(params: {
  surveyId: string;
  itemName: string;
  locationName: string;
  photoUrl?: string;
  note?: string;
}) {
  const spreadsheetId = requireSpreadsheetId();
  await appendRowByHeader(spreadsheetId, ATTACHMENTS_TAB, ATTACHMENTS_HEADER, {
    "Survey ID": params.surveyId,
    "Item Name": params.itemName,
    "Location Name": params.locationName,
    "Photo URL": params.photoUrl ?? "",
    Note: params.note ?? "",
  });
}
