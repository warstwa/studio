import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { currentUser, rateLimited } from "@/lib/auth";
import { ALLOWED_EXT, MAX_UPLOAD_BYTES, extOf } from "@/lib/files";

/**
 * Wystawia jednorazowe tokeny do wysyłki plików prosto z przeglądarki do Vercel Blob.
 * Plik nie przechodzi przez naszą funkcję serwerową (brak limitu 4,5 MB).
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const user = await currentUser();
        if (!user) throw new Error("Zaloguj się, aby dodać pliki.");
        if (await rateLimited(`upload:${user.id}`, 60, 60 * 60)) throw new Error("Za dużo plików w krótkim czasie.");
        if (!ALLOWED_EXT.includes(extOf(pathname))) throw new Error(`Nieobsługiwany typ pliku: .${extOf(pathname)}`);
        if (!pathname.startsWith(`zamowienia/${user.id}/`)) throw new Error("Nieprawidłowa ścieżka pliku.");
        return {
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: user.id }),
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Błąd wysyłki" }, { status: 400 });
  }
}
