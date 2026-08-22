"use client";

import { buildSingleSurveyWorkbook } from "./single-survey-workbook";
import { buildSingleSurveyPdf } from "./single-survey-pdf";
import { aggregateMethod2, ratingBand } from "@/lib/scoring";
import { METHOD1_ITEMS } from "@/lib/data/method1-items";
import { METHOD2_GROUPS } from "@/lib/data/method2-items";
import type { SurveyState } from "@/lib/survey-context";
import type { ScoreResult } from "@/lib/types";

/**
 * Pre-submission export fallback (Round 3 Task 9): if submission is
 * failing, the surveyor still walks away with a complete, legible record of
 * their work instead of one trapped in the app. That purpose only holds up
 * if generating the file itself doesn't need the network either — so this
 * builds straight from live SurveyContext state, client-side, reusing the
 * exact same formula-driven Excel/PDF builders the post-submission export
 * routes use (see those files' header comments).
 *
 * Photos aren't embedded — that would reintroduce the payload-size problem
 * this whole feature exists to route around (Task 8). Once Task 8's Drive
 * upload has resolved, each photo already has a url; that's what's exported
 * instead of the bytes.
 */

const NOT_SUBMITTED_LABEL = "Not yet submitted (draft export)";

interface DraftExportParams {
  state: SurveyState;
  result: ScoreResult;
  powerSupply: string;
  complaints: string;
}

function liveElapsedSeconds(state: SurveyState): number | null {
  if (!state.startTime) return null;
  const pausedTotal =
    state.pausedSeconds + (state.pausedAt ? (Date.now() - new Date(state.pausedAt).getTime()) / 1000 : 0);
  return Math.max(0, Math.round((Date.now() - new Date(state.startTime).getTime()) / 1000 - pausedTotal));
}

/** attachmentKey-free flat list — one row per photo actually uploaded (has a url), item name plus link. */
function photoLinksByItem(state: SurveyState): { itemName: string; locationName: string; url: string }[] {
  const links: { itemName: string; locationName: string; url: string }[] = [];
  if (state.method === 1) {
    for (const [itemName, photos] of Object.entries(state.m1.photos)) {
      for (const p of photos) if (p.status === "uploaded" && p.url) links.push({ itemName, locationName: "", url: p.url });
    }
  } else if (state.method === 2) {
    for (const loc of state.m2.locations) {
      for (const [itemName, photos] of Object.entries(loc.photos)) {
        for (const p of photos) if (p.status === "uploaded" && p.url) links.push({ itemName, locationName: loc.name, url: p.url });
      }
    }
  }
  return links;
}

function sanitizeFilenamePart(s: string): string {
  return s.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "draft";
}

export function draftExportFilenameBase(state: SurveyState): string {
  const school = sanitizeFilenamePart(state.school?.name ?? "survey");
  const date = new Date().toISOString().slice(0, 10);
  return `mqi-draft-${school}-${date}`;
}

export async function buildDraftExcelBlob({ state }: DraftExportParams): Promise<Blob> {
  const method = state.method === 2 ? 2 : 1;
  const links = photoLinksByItem(state);

  const wb = buildSingleSurveyWorkbook({
    surveyId: state.surveyId ?? "draft",
    campusName: state.school?.name ?? "",
    method,
    submittedAt: NOT_SUBMITTED_LABEL,
    startTime: state.startTime ?? "",
    endTime: "",
    timeTakenSeconds: liveElapsedSeconds(state),
    conditions: method === 1 ? state.m1.scores : {},
    aggregatedScores: method === 2 ? aggregateMethod2(state.m2.locations) : undefined,
    items: method === 1 ? METHOD1_ITEMS : METHOD2_GROUPS,
  });

  if (links.length > 0) {
    const sheet = wb.addWorksheet("Photos");
    sheet.columns = [
      { header: "Item", key: "item", width: 40 },
      { header: "Location", key: "location", width: 24 },
      { header: "Photo link", key: "url", width: 60 },
    ];
    sheet.getRow(1).font = { bold: true };
    links.forEach((l, i) => {
      const row = sheet.getRow(i + 2);
      row.getCell(1).value = l.itemName;
      row.getCell(2).value = l.locationName;
      const cell = row.getCell(3);
      cell.value = { text: l.url, hyperlink: l.url };
      cell.font = { color: { argb: "FF0E5C4D" }, underline: true };
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export async function buildDraftPdfBlob({ state, result, powerSupply, complaints }: DraftExportParams): Promise<Blob> {
  const method = state.method === 2 ? 2 : 1;
  const items = method === 1 ? METHOD1_ITEMS : METHOD2_GROUPS;
  const itemValues: Record<string, string> =
    method === 1
      ? Object.fromEntries(items.map((i) => [i.name, state.m1.scores[i.name] ?? ""]))
      : Object.fromEntries(
          Object.entries(aggregateMethod2(state.m2.locations)).map(([name, score]) => [
            name,
            `Aggregated (${Math.round(score)}%)`,
          ])
        );

  const bytes = await buildSingleSurveyPdf({
    surveyId: state.surveyId ?? "draft",
    campusName: state.school?.name ?? "",
    region: state.school?.region ?? "",
    area: state.school?.area ?? "",
    method,
    submittedAt: NOT_SUBMITTED_LABEL,
    startTime: state.startTime ?? "",
    endTime: "",
    timeTakenSeconds: liveElapsedSeconds(state),
    apm: state.apm,
    asm: state.asm,
    principal: state.principal,
    powerSupply,
    complaints,
    overall: result.overall,
    functionality: result.categories.Functionality.score,
    safety: result.categories.Safety.score,
    aesthetics: result.categories.Aesthetics.score,
    ratingBand: ratingBand(result.overall) ?? "",
    itemValues,
    items,
  });
  // pdf-lib's Uint8Array<ArrayBufferLike> doesn't structurally satisfy
  // BlobPart's stricter Uint8Array<ArrayBuffer> under this TS lib version —
  // a runtime no-op, just a type mismatch between two otherwise-identical shapes.
  return new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
}

/** Standard blob-download dance — no server round trip, works fully offline. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
