"use client";

import type { School } from "@/lib/types";
import type { Submission } from "@/lib/submit";

const DB_NAME = "mqi-offline";
const DB_VERSION = 1;
const SCHOOLS_STORE = "schoolsCache";
const SUBMISSIONS_STORE = "pendingSubmissions";
const SCHOOLS_KEY = "schools";

export interface QueuedSubmission extends Submission {
  id: number;
  createdAt: string;
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
    };
    req.onsuccess = () => resolve(req.result);
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
