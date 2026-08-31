"use client";

import type { SurveyState } from "./survey-context";
import type { PhotoAsset } from "./types";
import { saveDraft as saveDraftToDb } from "./offline/db";

/** Fired on window whenever the saved-drafts list may have changed, so the home screen's banner can refresh. */
export const DRAFTS_CHANGED_EVENT = "mqi-drafts-changed";

function notifyChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(DRAFTS_CHANGED_EVENT));
}

function settlePhotos(photos: Record<string, PhotoAsset[]>): Record<string, PhotoAsset[]> {
  const out: Record<string, PhotoAsset[]> = {};
  for (const [name, list] of Object.entries(photos)) {
    // A photo still "uploading" at save time can't be confirmed to have
    // landed — its in-flight fetch doesn't survive closing the app — so
    // it's downgraded to "error" here, same as a real failed upload, with
    // the same retry control already in place once the draft is resumed.
    out[name] = list.map((p) => (p.status === "uploading" ? { ...p, status: "error" } : p));
  }
  return out;
}

/**
 * Snapshots the in-progress survey to IndexedDB so it survives closing the
 * app (Round 3 Task 9). Doesn't touch startTime/pausedAt/pausedSeconds —
 * this is a mid-progress save, not a "return to method selection" action,
 * so the timer keeps running exactly as it was.
 */
export async function saveDraft(state: SurveyState): Promise<void> {
  if (!state.school || !state.method) {
    throw new Error("Can't save a draft before a school and method are chosen");
  }
  // surveyId is minted alongside method (SET_METHOD) and survives LOAD_DRAFT
  // on resume, so it's already the stable identity for "this one assessment
  // attempt" — reusing it as the drafts-store key is what makes a repeat
  // Save draft tap overwrite the same record instead of forking a new one.
  if (!state.surveyId) {
    throw new Error("Can't save a draft without a survey id");
  }
  const snapshot: SurveyState = {
    ...state,
    m1: { ...state.m1, photos: settlePhotos(state.m1.photos) },
    m2: {
      locations: state.m2.locations.map((l) => ({ ...l, photos: settlePhotos(l.photos) })),
      current: state.m2.current ? { ...state.m2.current, photos: settlePhotos(state.m2.current.photos) } : null,
    },
  };
  await saveDraftToDb({
    surveyId: state.surveyId,
    savedAt: new Date().toISOString(),
    schoolName: state.school.name,
    method: state.method,
    state: snapshot,
  });
  notifyChanged();
}
