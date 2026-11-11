import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getRequest, listMakers, toPublic } from "@/lib/data";
import { blobEnabled } from "@/lib/files";
import { bestFit } from "@/lib/match";
import { StatusPill } from "@/components/ui";
import OrderEditor from "./OrderEditor";
import FitList from "@/components/FitList";
import SlicerCard from "@/components/SlicerCard";

export const metadata: Metadata = { title: "Szczegóły zamówienia" };
export const dynamic = "force-dynamic";

export default async function EditOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await currentUser();
  if (!me) redirect(`/logowanie?next=/zamow/${id}`);
  const r = await getRequest(id);
  if (!r || r.clientId !== me.id || r.parentId) notFound();
  if (r.status !== "draft" && r.status !== "open") redirect(`/zapytania/${id}`);

  const makers = (await listMakers()).filter((m) => m.id !== me.id);
  const fits = bestFit(r, makers).slice(0, 4);
  const byId = Object.fromEntries(makers.map((m) => [m.id, toPublic(m)]));

  return (
    <div className="page">
      <div className="wrap">
        <div className="page-head">
          <div>
            <div className="crumbs mono">
              <Link href="/panel?widok=zamowienia">Zamówienia</Link> / <span>{r.code}</span>
            </div>
            <h1>{r.status === "draft" ? "Szczegóły zamówienia" : "Edytuj zlecenie"}</h1>
            <p>
              {r.status === "draft"
                ? "Uzupełnij to, co wiesz — resztę doprecyzujesz z drukarzem. Szkic zapisuje się, dopóki go nie wyślesz."
                : "Zlecenie jest już na giełdzie. Zmiany zobaczą drukarze, którzy przeglądają lub wyceniają zlecenie."}
            </p>
          </div>
          <div className="row">
            <span className="mono dim">krok 2 z 2</span>
            <StatusPill status={r.status} />
          </div>
        </div>
        <div className="two-col">
          <div className="stack">
            {r.slicer && <SlicerCard s={r.slicer} />}
            <OrderEditor r={r} blob={blobEnabled()} userId={me.id} />
          </div>
          <aside className="stack sticky">
            <FitList fits={fits} makers={byId} title="Najlepsze dopasowanie" note="Po wysłaniu zlecenia zaprosimy najlepiej dopasowanych drukarzy jako pierwszych. Zlecenie zobaczą też wszyscy drukarze w zakładce Zlecenia." />
          </aside>
        </div>
      </div>
    </div>
  );
}
