"use client";
import type { SlicerSummary } from "./types";

/**
 * Schowek w IndexedDB na „Dodaj do zamówienia” przed zalogowaniem —
 * pliki modelu i wynik kalkulatora przetrwają przejście przez logowanie.
 */
const DB = "warstwa", STORE = "stash", KEY = "slicer-order";
type Stash = { slicer: SlicerSummary; files: File[]; at: number };

function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((res, rej) => {
    const req = fn(d.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export const stashOrder = (slicer: SlicerSummary, files: File[]) => tx("readwrite", (s) => s.put({ slicer, files, at: Date.now() } satisfies Stash, KEY));
export async function takeStash(): Promise<Stash | null> {
  try {
    const v = (await tx<Stash | undefined>("readonly", (s) => s.get(KEY))) ?? null;
    await tx("readwrite", (s) => s.delete(KEY));
    return v && Date.now() - v.at < 24 * 3600_000 ? v : null;
  } catch {
    return null;
  }
}
