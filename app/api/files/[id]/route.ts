import { localFiles } from "@/lib/local-files";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const f = localFiles.get((await params).id);
  if (!f) return new Response("Nie znaleziono", { status: 404 });
  return new Response(new Uint8Array(f.data), {
    headers: { "content-type": f.type, "content-disposition": `inline; filename="${encodeURIComponent(f.name)}"` },
  });
}
