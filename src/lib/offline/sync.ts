"use client";

import { uploadPhoto } from "@/lib/photo-upload";
import { notifyAuthRequired } from "@/lib/auth/events";
import type { QueuedSubmission, SyncFailureKind } from "./db";
import { getPendingSubmissions, removePendingSubmission, updatePendingSubmission } from "./db";

/** Fired on window whenever the pending-submission count or a queued survey's sync status may have changed, so the Queue tab can refresh. */
export const SYNC_CHANGED_EVENT = "mqi-sync-changed";

/** localStorage key holding the ISO time of the last survey that synced successfully — shown on the Queue tab. */
export const LAST_SYNC_KEY = "mqi-last-sync";

function notifyChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SYNC_CHANGED_EVENT));
}

/** True while a flush is running — the Queue tab shows "Syncing…" for the survey being sent. */
let flushing = false;
export function isSyncing(): boolean {
  return flushing;
}

/** Remembers why a queued survey is still waiting, so the Queue tab can say so. Never throws — bookkeeping must not break the sync itself. */
async function noteFailure(submission: QueuedSubmission, kind: SyncFailureKind, message: string): Promise<void> {
  try {
    await updatePendingSubmission({
      ...submission,
      attempts: (submission.attempts ?? 0) + 1,
      lastAttemptAt: new Date().toISOString(),
      lastError: { kind, message },
    });
  } catch {
    // ignore
  }
}

type PhotoResult = "ok" | "auth" | "failed";

/**
 * Uploads whatever's left in a queued submission's pendingPhotos (photos
 * that couldn't upload at submit time — see submit.ts's PendingPhotoUpload)
 * and folds each success into the payload's photoKeys, mutating `submission`
 * in place. Persists progress after every single photo (not just at the
 * end) so a flush interrupted partway through — connection drops again,
 * tab closes — doesn't re-upload ones that already succeeded next time.
 * Stops at the first photo that still fails ("failed" — almost always still
 * offline) or is turned away for lack of a session ("auth"), leaving it and
 * everything after it in pendingPhotos for the next attempt.
 */
async function resolvePendingPhotos(submission: QueuedSubmission): Promise<PhotoResult> {
  if (submission.pendingPhotos.length === 0) return "ok";
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
    } catch (err) {
      return err instanceof Error && err.name === "AuthRequiredError" ? "auth" : "failed";
    }
  }
  return "ok";
}

class HttpError extends Error {
  constructor(public status: number) {
    super(`Submit failed: ${status}`);
  }
}

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
 *
 * A 401 means the session is gone or no longer approved, not that the survey
 * is bad: it stays queued untouched, the app is told to ask for sign-in
 * (notifyAuthRequired), and the next flush after signing in sends it.
 */
export async function flushPendingSubmissions(): Promise<{ succeeded: number; remaining: number }> {
  if (flushing) return { succeeded: 0, remaining: (await getPendingSubmissions()).length };
  flushing = true;
  notifyChanged();
  let succeeded = 0;
  try {
    const pending = await getPendingSubmissions();
    for (const submission of pending) {
      try {
        const photos = await resolvePendingPhotos(submission);
        if (photos === "auth") {
          await noteFailure(submission, "auth", "Sign in to sync");
          break;
        }
        if (photos === "failed") {
          await noteFailure(submission, "offline", "Waiting for a connection to upload photos");
          break; // still offline — leave this and the rest queued for next time
        }
        const res = await fetch("/api/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submission.payload),
        });
        if (res.status === 401) {
          await noteFailure(submission, "auth", "Sign in to sync");
          notifyAuthRequired();
          break;
        }
        if (!res.ok) throw new HttpError(res.status);
        await removePendingSubmission(submission.id);
        succeeded++;
        try {
          localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
        } catch {}
        notifyChanged();
      } catch (err) {
        if (err instanceof HttpError) {
          await noteFailure(submission, "server", `Server error (${err.status}) — will retry`);
        } else {
          await noteFailure(submission, "offline", "Waiting for a connection");
        }
        break; // likely still offline — leave the rest queued for next time
      }
    }
    const remaining = (await getPendingSubmissions()).length;
    return { succeeded, remaining };
  } finally {
    flushing = false;
    notifyChanged();
  }
}
