"use client";

import type { School } from "@/lib/types";
import type { Submission } from "@/lib/submit";
import type { SurveyState } from "@/lib/survey-context";

const DB_NAME = "mqi-offline";
// v3 rekeys DRAFTS_STORE from an autoIncrement id to surveyId (see below) —
// onupgradeneeded deletes and recreates just that store; the existing
// guarded creates for the other stores no-op as before. Any drafts saved
// under v2's numbering are dropped in the process, which is an acceptable
// one-time cost: they're local-only, unsynced, and the bug this fixes was
// already leaving them duplicated and unreliable to resume from.
const DB_VERSION = 3;
const SCHOOLS_STORE = "schoolsCache";
const SUBMISSIONS_STORE = "pendingSubmissions";
const DRAFTS_STORE = "drafts";
const SCHOOLS_KEY = "schools";

export interface QueuedSubmission extends Submission {
  id: number;
  createdAt: string;
}

/**
 * A full in-progress survey, snapshotted so it survives closing the app
 * (Round 3 Task 9) — distinct from QueuedSubmission, which is a *finished*
 * submission waiting only for connectivity. `state` is the raw SurveyState;
 * IndexedDB's structured clone handles the File objects inside its photo
 * maps natively (unlike JSON), same as QueuedSubmission relied on before
 * Task 8 made submissions File-free.
 *
 * Keyed by `surveyId` (minted once in survey-context's SET_METHOD and
 * carried through LOAD_DRAFT on resume) rather than an autoIncrement id —
 * tapping "Save draft" repeatedly during the same assessment must update
 * that one record in place, not fork a new row every time. An autoIncrement
 * key did exactly that: every save silently left behind another stale,
 * out-of-date copy of the same in-progress survey, which is what made
 * saving feel unreliable — resuming could grab an older duplicate instead
 * of the latest save.
 */
export interface SurveyDraft {
  surveyId: string;
  savedAt: string;
  schoolName: string;
  method: 1 | 2;
  state: SurveyState;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SCHOOLS_STORE)) {
        db.createObjectStore(SCHOOLS_STORE);
      }
      if (!db.objectStoreNames.contains(SUBMISSIONS_STORE)) {
        db.createObjectStore(SUBMISSIONS_STORE, { keyPath: "id", autoIncrement: true });
      }
      // Rekeying (v2 -> v3, see DB_VERSION above) means dropping and
      // recreating this one store even though it already exists, since an
      // object store's keyPath can't be changed in place.
      if (db.objectStoreNames.contains(DRAFTS_STORE)) {
        db.deleteObjectStore(DRAFTS_STORE);
      }
      db.createObjectStore(DRAFTS_STORE, { keyPath: "surveyId" });
    };
    req.onsuccess = () => {
      const db = req.result;
      // Every call here opens a fresh connection rather than pooling one
      // (simple, and fine for how infrequently these run) — but that means
      // whichever connection opened first is still sitting open with no
      // reason to close itself. Without this, the v1 -> v2 upgrade (Round 3
      // Task 9 adding DRAFTS_STORE) blocks forever behind that older
      // connection the instant two calls overlap in the same tab, and
      // onupgradeneeded above never gets to run. Closing proactively when a
      // newer version wants in is the standard fix.
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onblocked = () => {
      // Another still-open connection (this tab or another) hasn't reacted
      // to onversionchange yet — surface a clear, specific error instead of
      // hanging forever, since IDBOpenDBRequest never fires onerror for this.
      reject(new Error("IndexedDB upgrade is blocked by another open connection — try closing other tabs of this app"));
    };
    req.onerror = () => reject(req.error);
  });
}

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheSchools(schools: School[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(SCHOOLS_STORE, "readwrite");
  tx.objectStore(SCHOOLS_STORE).put(schools, SCHOOLS_KEY);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedSchools(): Promise<School[] | null> {
  const db = await openDB();
  const tx = db.transaction(SCHOOLS_STORE, "readonly");
  const result = await promisify<School[] | undefined>(tx.objectStore(SCHOOLS_STORE).get(SCHOOLS_KEY));
  return result ?? null;
}

export async function queueSubmission(submission: Submission): Promise<number> {
  const db = await openDB();
  const tx = db.transaction(SUBMISSIONS_STORE, "readwrite");
  const record = { ...submission, createdAt: new Date().toISOString() };
  const id = await promisify(tx.objectStore(SUBMISSIONS_STORE).add(record));
  return id as number;
}

export async function getPendingSubmissions(): Promise<QueuedSubmission[]> {
  const db = await openDB();
  const tx = db.transaction(SUBMISSIONS_STORE, "readonly");
  const all = await promisify<QueuedSubmission[]>(tx.objectStore(SUBMISSIONS_STORE).getAll());
  return all;
}

export async function removePendingSubmission(id: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(SUBMISSIONS_STORE, "readwrite");
  tx.objectStore(SUBMISSIONS_STORE).delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Overwrites one already-queued submission in place — used by
 * flushPendingSubmissions to persist progress as each of a submission's
 * pendingPhotos resolves, so a flush that gets interrupted partway through
 * (still offline, tab closed) doesn't re-upload photos that already
 * succeeded on the next attempt. `id` (the keyPath) must already be present
 * on `submission`, i.e. this only ever patches a record `getPendingSubmissions`
 * already returned — it never creates a new one (see queueSubmission for that).
 */
export async function updatePendingSubmission(submission: QueuedSubmission): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(SUBMISSIONS_STORE, "readwrite");
  tx.objectStore(SUBMISSIONS_STORE).put(submission);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function countPendingSubmissions(): Promise<number> {
  const db = await openDB();
  const tx = db.transaction(SUBMISSIONS_STORE, "readonly");
  return promisify(tx.objectStore(SUBMISSIONS_STORE).count());
}

/** put(), not add() — a second save for the same surveyId must overwrite the first, not fork a duplicate row. See SurveyDraft's doc comment. */
export async function saveDraft(draft: SurveyDraft): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(DRAFTS_STORE, "readwrite");
  tx.objectStore(DRAFTS_STORE).put(draft);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Newest-first — the most recently saved draft is the one someone's most likely reopening the app to resume. */
export async function getDrafts(): Promise<SurveyDraft[]> {
  const db = await openDB();
  const tx = db.transaction(DRAFTS_STORE, "readonly");
  const all = await promisify<SurveyDraft[]>(tx.objectStore(DRAFTS_STORE).getAll());
  return all.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function getDraft(surveyId: string): Promise<SurveyDraft | null> {
  const db = await openDB();
  const tx = db.transaction(DRAFTS_STORE, "readonly");
  const result = await promisify<SurveyDraft | undefined>(tx.objectStore(DRAFTS_STORE).get(surveyId));
  return result ?? null;
}

export async function deleteDraft(surveyId: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(DRAFTS_STORE, "readwrite");
  tx.objectStore(DRAFTS_STORE).delete(surveyId);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function countDrafts(): Promise<number> {
  const db = await openDB();
  const tx = db.transaction(DRAFTS_STORE, "readonly");
  return promisify(tx.objectStore(DRAFTS_STORE).count());
}
