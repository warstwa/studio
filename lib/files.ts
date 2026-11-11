import "server-only";
import type { Attachment } from "./types";

export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200 MB na plik
export const MODEL_EXT = ["stl", "3mf", "step", "stp", "obj"];
export const IMAGE_EXT = ["jpg", "jpeg", "png", "webp", "heic", "gif"];
export const OTHER_EXT = ["pdf", "zip", "gcode", "dxf", "svg", "f3d", "skp"];
export const ALLOWED_EXT = [...MODEL_EXT, ...IMAGE_EXT, ...OTHER_EXT];

export function blobEnabled() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export function extOf(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function kindOf(name: string): Attachment["kind"] {
  const e = extOf(name);
  return MODEL_EXT.includes(e) ? "model" : IMAGE_EXT.includes(e) ? "image" : "other";
}

/** Akceptujemy wyłącznie adresy z naszego magazynu — nie dowolne linki podesłane w formularzu. */
function trustedUrl(url: string) {
  try {
    const u = new URL(url, "http://local");
    if (u.origin === "http://local") return u.pathname.startsWith("/api/files/") && !blobEnabled();
    return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export function parseAttachments(raw: unknown): Attachment[] {
  let list: unknown;
  try {
    list = typeof raw === "string" ? JSON.parse(raw || "[]") : raw;
  } catch {
    return [];
  }
  if (!Array.isArray(list)) return [];
  return list
    .filter((a): a is Attachment => !!a && typeof a.url === "string" && typeof a.name === "string")
    .filter((a) => trustedUrl(a.url) && ALLOWED_EXT.includes(extOf(a.name)))
    .slice(0, 12)
    .map((a) => ({ name: a.name.slice(0, 160), url: a.url, size: Math.max(0, Number(a.size) || 0), kind: kindOf(a.name) }));
}
