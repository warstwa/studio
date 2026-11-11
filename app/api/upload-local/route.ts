import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { currentUser } from "@/lib/auth";
import { ALLOWED_EXT, blobEnabled, extOf } from "@/lib/files";
import { localFiles } from "@/lib/local-files";


export async function POST(request: Request) {
  if (blobEnabled()) return NextResponse.json({ error: "Użyj /api/upload" }, { status: 400 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Zaloguj się, aby dodać pliki." }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Brak pliku" }, { status: 400 });
  if (!ALLOWED_EXT.includes(extOf(file.name))) return NextResponse.json({ error: `Nieobsługiwany typ pliku: .${extOf(file.name)}` }, { status: 400 });
  if (file.size > 25 * 1024 * 1024) return NextResponse.json({ error: "Lokalnie max 25 MB" }, { status: 400 });
  const id = randomBytes(12).toString("base64url");
  localFiles.set(id, { name: file.name, type: file.type || "application/octet-stream", data: Buffer.from(await file.arrayBuffer()) });
  return NextResponse.json({ url: `/api/files/${id}?n=${encodeURIComponent(file.name)}` });
}
