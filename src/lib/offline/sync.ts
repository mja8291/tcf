"use client";

import { uploadPhoto } from "@/lib/photo-upload";
import type { QueuedSubmission } from "./db";
import { getPendingSubmissions, removePendingSubmission, updatePendingSubmission } from "./db";

/** Fired on window whenever the pending-submission count may have changed, so UI badges can refresh. */
export const SYNC_CHANGED_EVENT = "mqi-sync-changed";

function notifyChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SYNC_CHANGED_EVENT));
}

/**
 * Uploads whatever's left in a queued submission's pendingPhotos (photos
 * that couldn't upload at submit time — see submit.ts's PendingPhotoUpload)
 * and folds each success into the payload's photoKeys, mutating `submission`
 * in place. Persists progress after every single photo (not just at the
 * end) so a flush interrupted partway through — connection drops again,
 * tab closes — doesn't re-upload ones that already succeeded next time.
 * Returns false the moment one still fails (still offline), leaving it and
 * everything after it in pendingPhotos for the next attempt.
 */
async function resolvePendingPhotos(submission: QueuedSubmission): Promise<boolean> {
  if (submission.pendingPhotos.length === 0) return true;
  const remaining = [...submission.pendingPhotos];
  while (remaining.length > 0) {
    const photo = remaining[0];
    try {
      const { url } = await uploadPhoto({
        surveyId: submission.payload.surveyId,
        region: submission.payload.school.region,
        campusName: submission.payload.school.name,
        itemName: photo.itemName,
        location: photo.location,
        file: photo.file,
      });
      if (!url) throw new Error("Upload succeeded but returned no url");
      submission.payload.photoKeys.push({
        attachmentKey: photo.attachmentKey,
        itemName: photo.itemName,
        locationName: photo.locationName,
        url,
      });
      remaining.shift();
      submission.pendingPhotos = remaining;
      await updatePendingSubmission(submission);
    } catch {
      return false; // still can't upload this one — stop here, leave it queued
    }
  }
  return true;
}

let flushing = false;

/**
 * Sends every queued submission to the server in order, oldest first —
 * first resolving any pendingPhotos it's still carrying (see
 * resolvePendingPhotos), since a submission attached with zero connectivity
 * throughout may have arrived here with every photo still unresolved, not
 * just its JSON payload. Stops at the first submission that still can't
 * fully resolve (almost always "still offline") rather than hammering the
 * rest — they'll retry on the next flush. Safe to call opportunistically
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
        const photosResolved = await resolvePendingPhotos(submission);
        if (!photosResolved) break; // still offline — leave this and the rest queued for next time
        const res = await fetch("/api/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submission.payload),
        });
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
