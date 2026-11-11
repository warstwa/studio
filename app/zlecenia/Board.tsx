"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Empty } from "@/components/ui";

export interface BoardItem {
  id: string;
  code: string;
  title: string;
  description: string;
  material: string;
  color: string;
  quantity: number;
  dims: string;
  deadline?: string;
  budget?: number;
  city?: string;
  delivery?: string;
  source?: string;
  files: number;
  models: number;
  slicer: { seconds: number; grams: number; colors: number } | null;
  offers: number;
  createdAt: number;
  own: boolean;
  invited: boolean;
  fit: { score: number; reasons: string[]; warning?: string } | null;
  myOffer: { price: number; status: string } | null;
}

const FILTERS = ["PLA", "PETG", "ABS", "ASA", "TPU", "PA-CF", "PC", "Żywica"];
const SOURCE: Record<string, string> = { file: "Plik", idea: "Pomysł", slicer: "Z kalkulatora", direct: "Zapytanie" };

function since(ms: number) {
  const h = Math.round((Date.now() - ms) / 3600000);
  if (h < 1) return "przed chwilą";
  if (h < 24) return `${h} godz. temu`;
  const d = Math.round(h / 24);
  return d === 1 ? "wczoraj" : `${d} dni temu`;
}
const dur = (s: number) => (s < 3600 ? `${Math.round(s / 60)} min` : `${Math.floor(s / 3600)} h ${String(Math.round((s % 3600) / 60)).padStart(2, "0")} min`);

export default function Board({ items, isMaker }: { items: BoardItem[]; isMaker: boolean }) {
  const [mat, setMat] = useState<string | null>(null);
  const [forMe, setForMe] = useState(isMaker);
  const [noOffer, setNoOffer] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"fit" | "new" | "deadline">(isMaker ? "fit" : "new");

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const out = items.filter((i) => {
      if (mat && !i.material.startsWith(mat)) return false;
      if (forMe && isMaker && !(i.invited || (i.fit && i.fit.score >= 60))) return false;
      if (noOffer && i.myOffer) return false;
      if (qq && ![i.title, i.description, i.city, i.code].join(" ").toLowerCase().includes(qq)) return false;
      return true;
    });
    return out.sort((a, b) =>
      sort === "fit"
        ? Number(b.invited) - Number(a.invited) || (b.fit?.score ?? 0) - (a.fit?.score ?? 0)
        : sort === "deadline"
          ? (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999")
          : b.createdAt - a.createdAt,
    );
  }, [items, mat, forMe, noOffer, q, sort, isMaker]);

  return (
    <>
      <div className="filters">
        {isMaker && (
          <button className="filter" aria-pressed={forMe} onClick={() => setForMe(!forMe)}>
            Pasujące do mnie
          </button>
        )}
        {isMaker && (
          <button className="filter" aria-pressed={noOffer} onClick={() => setNoOffer(!noOffer)}>
            Bez mojej oferty
          </button>
        )}
        {FILTERS.map((f) => (
          <button key={f} className="filter" aria-pressed={mat === f} onClick={() => setMat(mat === f ? null : f)}>
            {f}
          </button>
        ))}
        <select className="select select-sm sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sortowanie">
          {isMaker && <option value="fit">Najlepiej dopasowane</option>}
          <option value="new">Najnowsze</option>
          <option value="deadline">Najbliższy termin</option>
        </select>
        <input className="input search" placeholder="Szukaj w zleceniach…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Szukaj zleceń" />
      </div>
      {list.length ? (
        <div className="board" key={`${mat}-${forMe}-${noOffer}-${sort}`}>
          {list.map((i, n) => (
            <Link key={i.id} href={`/zapytania/${i.id}`} className={`order-card${i.invited ? " invited" : ""}`} style={{ ["--i" as string]: n }}>
              <div className="order-top">
                <span className="mono dim">{i.code} · {SOURCE[i.source ?? "file"]}</span>
                {i.own ? <span className="tag-help">Twoje</span> : i.invited ? <span className="tag-fit">Polecane dla Ciebie</span> : null}
                {i.fit && <span className="fit-score" title="Dopasowanie do Twojego profilu">{i.fit.score}%</span>}
              </div>
              <h3>{i.title}</h3>
              <p className="order-desc">{i.description || "Szczegóły w plikach zlecenia."}</p>
              <div className="chips">
                <span className="chip">{i.material}</span>
                <span className="chip">{i.quantity} szt.</span>
                {i.dims !== "—" && <span className="chip">{i.dims}</span>}
                {i.slicer && <span className="chip">≈ {dur(i.slicer.seconds)} · {Math.round(i.slicer.grams)} g</span>}
                {i.slicer && i.slicer.colors > 1 && <span className="chip">{i.slicer.colors} kolory</span>}
                {i.files > 0 && <span className="chip">{i.files} {i.files === 1 ? "plik" : i.files < 5 ? "pliki" : "plików"}</span>}
              </div>
              {i.fit && (i.fit.reasons.length > 0 || i.fit.warning) && (
                <div className="fit-why">
                  {i.fit.reasons.join(" · ")}
                  {i.fit.warning && <span className="fit-warn"> · {i.fit.warning}</span>}
                </div>
              )}
              <div className="spec">
                <div className="spec-row"><span>Termin</span><span>{i.deadline ? new Date(i.deadline + "T12:00").toLocaleDateString("pl-PL", { day: "numeric", month: "short" }) : "elastyczny"}</span></div>
                <div className="spec-row"><span>Budżet</span><span>{i.budget ? `do ${i.budget} zł` : "do wyceny"}</span></div>
                <div className="spec-row"><span>Odbiór</span><span>{i.delivery === "pickup" ? `osobiście · ${i.city ?? ""}` : `wysyłka · ${i.city ?? "Polska"}`}</span></div>
              </div>
              <div className="order-foot">
                <span className="dim">{since(i.createdAt)}</span>
                {i.myOffer ? (
                  <span className={`pill ${i.myOffer.status === "accepted" ? "go" : i.myOffer.status === "declined" ? "mute" : "help"}`}>
                    Twoja oferta · {i.myOffer.price} zł
                  </span>
                ) : (
                  <span className="dim">{i.offers === 0 ? "brak ofert" : `${i.offers} ${i.offers === 1 ? "oferta" : i.offers < 5 ? "oferty" : "ofert"}`}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Empty
          title={forMe ? "Brak zleceń dopasowanych do Twojego profilu" : "Brak otwartych zleceń"}
          text={forMe ? "Wyłącz filtr „Pasujące do mnie”, żeby zobaczyć wszystkie zlecenia, albo dodaj materiały w profilu." : "Nowe zlecenia pojawią się tutaj, gdy tylko ktoś je wyśle."}
        />
      )}
    </>
  );
}
