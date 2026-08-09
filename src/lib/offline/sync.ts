"use client";

import { formDataFromSubmission } from "@/lib/submit";
import { getPendingSubmissions, removePendingSubmission } from "./db";

/** Fired on window whenever the pending-submission count may have changed, so UI badges can refresh. */
export const SYNC_CHANGED_EVENT = "mqi-sync-changed";

function notifyChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SYNC_CHANGED_EVENT));
}

let flushing = false;

/**
 * Sends every queued submission to the server in order, oldest first. Stops
 * at the first failure (almost always "still offline") rather than hammering
 * the rest — they'll retry on the next flush. Safe to call opportunistically
 * (app open, regained connectivity) since it no-ops when nothing is queued
 * or a flush is already running.
 */
export async function flushPendingSubmissions(): Promise<{ succeeded: number; remaining: number }> {
  if (flushing) return { succeeded: 0, remaining: (await getPendingSubmissions()).length };
  flushing = true;
  let succeeded = 0;
  try {
    const pending = await getPendingSubmissions();
    for (const submission of pending) {
      try {
        const res = await fetch("/api/submit", { method: "POST", body: formDataFromSubmission(submission) });
        if (!res.ok) throw new Error(`Submit failed: ${res.status}`);
        await removePendingSubmission(submission.id);
        succeeded++;
        notifyChanged();
      } catch {
        break; // likely still offline — leave the rest queued for next time
      }
    }
    const remaining = (await getPendingSubmissions()).length;
    return { succeeded, remaining };
  } finally {
    flushing = false;
  }
}
