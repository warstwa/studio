import "server-only";

/** Zapasowy magazyn plików na czas developmentu (bez Vercel Blob). Dane w pamięci procesu. */
const g = globalThis as unknown as { __warstwaFiles?: Map<string, { name: string; type: string; data: Buffer }> };
export const localFiles = (g.__warstwaFiles ??= new Map());
