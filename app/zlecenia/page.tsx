import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { getOffer, listOpenOrders, offerCounts } from "@/lib/data";
import { scoreMaker } from "@/lib/match";
import { Arrow } from "@/components/ui";
import Board, { type BoardItem } from "./Board";

export const metadata: Metadata = { title: "Zlecenia" };
export const dynamic = "force-dynamic";

export default async function OrdersBoard() {
  const me = await currentUser();
  const open = await listOpenOrders();
  const counts = await offerCounts(open.map((r) => r.id));
  const items: BoardItem[] = await Promise.all(
    open.map(async (r) => {
      const fit = me?.maker && r.clientId !== me.id ? scoreMaker(r, me) : null;
      const mine = me?.maker ? await getOffer(r.id, me.id) : null;
      return {
        id: r.id,
        code: r.code,
        title: r.title,
        description: r.description.slice(0, 220),
        material: r.material,
        color: r.color,
        quantity: r.quantity,
        dims: r.dims,
        deadline: r.deadline,
        budget: r.budget,
        city: r.city,
        delivery: r.delivery,
        source: r.source,
        files: r.files?.length ?? 0,
        cover: r.files?.find((f) => f.kind === "image")?.url,
        photos: r.files?.filter((f) => f.kind === "image").length ?? 0,
        swatches: r.slicer?.filaments.map((f) => f.color) ?? [],
        models: r.files?.filter((f) => f.kind === "model").length ?? 0,
        slicer: r.slicer ? { seconds: r.slicer.seconds, grams: r.slicer.grams, colors: r.slicer.filaments.length } : null,
        offers: counts[r.id] ?? 0,
        createdAt: r.createdAt,
        own: r.clientId === me?.id,
        invited: !!me && (r.invited ?? []).includes(me.id),
        fit: fit ? { score: fit.score, reasons: fit.reasons.slice(0, 2), warning: fit.warnings[0] } : null,
        myOffer: mine && mine.status !== "withdrawn" ? { price: mine.price, status: mine.status } : null,
      };
    }),
  );

  return (
    <div className="page">
      <div className="wrap">
        <div className="page-head">
          <div>
            <div className="crumbs mono">Sieć / Zlecenia</div>
            <h1>Zlecenia</h1>
            <p>
              {me?.maker
                ? "Otwarte zlecenia od zamawiających. Na górze te, do których najlepiej pasujesz — złóż ofertę z ceną i terminem."
                : "Otwarte zlecenia czekające na oferty drukarzy. Masz drukarkę? Uzupełnij profil drukarza, żeby składać oferty."}
            </p>
          </div>
          <div className="row">
            {!me?.maker && <Link href={me ? "/profil" : "/rejestracja?rola=drukarz"} className="btn">Zostań drukarzem</Link>}
            <Link href="/zamow" className="btn btn-primary">Złóż zamówienie <Arrow /></Link>
          </div>
        </div>
        <Board items={items} isMaker={!!me?.maker} />
      </div>
    </div>
  );
}
