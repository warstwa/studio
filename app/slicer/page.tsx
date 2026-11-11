import type { Metadata } from "next";
import { currentUser } from "@/lib/auth";
import { blobEnabled } from "@/lib/files";
import SlicerTool from "./SlicerTool";

export const metadata: Metadata = {
  title: "Slicer — kalkulator druku",
  description: "Wgraj plik STL, 3MF lub STEP i sprawdź szacowany czas druku, zużycie filamentu i podpory.",
};
export const dynamic = "force-dynamic";

export default async function SlicerPage({ searchParams }: { searchParams: Promise<{ wznow?: string; plik?: string; n?: string }> }) {
  const me = await currentUser();
  const sp = await searchParams;
  // model ze zlecenia (tylko z naszego magazynu plików)
  const fileUrl = sp.plik && (/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(sp.plik) || sp.plik.startsWith("/api/files/")) ? sp.plik : undefined;
  return (
    <div className="page">
      <div className="wrap">
        <div className="page-head">
          <div>
            <div className="crumbs mono">Narzędzia / <span>Slicer</span></div>
            <h1>Kalkulator druku</h1>
            <p>Wgraj model, a od razu zobaczysz szacowany czas druku, ilość filamentu i podpory. Gotowe? Dodaj go do zamówienia — drukarze przyślą oferty.</p>
          </div>
        </div>
        <SlicerTool
          account={me ? { id: me.id } : null}
          blob={blobEnabled()}
          resume={sp.wznow === "1"}
          remote={fileUrl ? { url: fileUrl, name: (sp.n || "model.stl").slice(0, 160) } : undefined}
        />
      </div>
    </div>
  );
}
