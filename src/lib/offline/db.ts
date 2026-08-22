"use client";

import type { School } from "@/lib/types";
import type { Submission } from "@/lib/submit";
import type { SurveyState } from "@/lib/survey-context";

const DB_NAME = "mqi-offline";
// v2 adds DRAFTS_STORE (Round 3 Task 9) — onupgradeneeded fires with the
// existing stores already present when bumping the version, so the
// pre-existing guarded creates below just no-op and only the new store
// gets added; nothing here needs to migrate v1 data.
const DB_VERSION = 2;
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
 */
export interface SurveyDraft {
  id: number;
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
      if (!db.objectStoreNames.contains(DRAFTS_STORE)) {
        db.createObjectStore(DRAFTS_STORE, { keyPath: "id", autoIncrement: true });
      }
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

export async function countPendingSubmissions(): Promise<number> {
  const db = await openDB();
  const tx = db.transaction(SUBMISSIONS_STORE, "readonly");
  return promisify(tx.objectStore(SUBMISSIONS_STORE).count());
}

export async function saveDraft(draft: Omit<SurveyDraft, "id">): Promise<number> {
  const db = await openDB();
  const tx = db.transaction(DRAFTS_STORE, "readwrite");
  const id = await promisify(tx.objectStore(DRAFTS_STORE).add(draft));
  return id as number;
}

/** Newest-first — the most recently saved draft is the one someone's most likely reopening the app to resume. */
export async function getDrafts(): Promise<SurveyDraft[]> {
  const db = await openDB();
  const tx = db.transaction(DRAFTS_STORE, "readonly");
  const all = await promisify<SurveyDraft[]>(tx.objectStore(DRAFTS_STORE).getAll());
  return all.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function getDraft(id: number): Promise<SurveyDraft | null> {
  const db = await openDB();
  const tx = db.transaction(DRAFTS_STORE, "readonly");
  const result = await promisify<SurveyDraft | undefined>(tx.objectStore(DRAFTS_STORE).get(id));
  return result ?? null;
}

export async function deleteDraft(id: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(DRAFTS_STORE, "readwrite");
  tx.objectStore(DRAFTS_STORE).delete(id);
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
