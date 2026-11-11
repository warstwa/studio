"use client";
import { upload } from "@vercel/blob/client";
import type { Attachment } from "./types";

const MODEL = ["stl", "3mf", "step", "stp", "obj"];
const IMAGE = ["jpg", "jpeg", "png", "webp", "heic", "gif"];
export const ACCEPT_ATTACH = ".stl,.3mf,.step,.stp,.obj,.jpg,.jpeg,.png,.webp,.heic,.gif,.pdf,.zip,.gcode,.dxf,.svg,.f3d,.skp";

const ext = (n: string) => n.split(".").pop()?.toLowerCase() ?? "";
export const kindOf = (n: string): Attachment["kind"] => (MODEL.includes(ext(n)) ? "model" : IMAGE.includes(ext(n)) ? "image" : "other");

/** Bezpieczna nazwa w ścieżce magazynu (polskie znaki → ASCII, spacje → '-'). */
function safeName(name: string) {
  return name.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l").replace(/Ł/g, "L").replace(/[^\w.\-]+/g, "-").slice(-120);
}

/** Wysyła pliki: w produkcji prosto do Vercel Blob, lokalnie do zapasowego magazynu w pamięci. */
export async function uploadFiles(
  files: File[],
  opts: { blob: boolean; userId: string; onProgress?: (name: string, pct: number) => void },
): Promise<Attachment[]> {
  const out: Attachment[] = [];
  for (const f of files) {
    let url: string;
    if (opts.blob) {
      const res = await upload(`zamowienia/${opts.userId}/${safeName(f.name)}`, f, {
        access: "public",
        handleUploadUrl: "/api/upload",
        multipart: f.size > 8 * 1024 * 1024,
        onUploadProgress: (p) => opts.onProgress?.(f.name, Math.round(p.percentage)),
      });
      url = res.url;
    } else {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/upload-local", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Nie udało się wysłać pliku.");
      url = json.url;
      opts.onProgress?.(f.name, 100);
    }
    out.push({ name: f.name, url, size: f.size, kind: kindOf(f.name) });
  }
  return out;
}
