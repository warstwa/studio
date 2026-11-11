"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { acceptOfferAction } from "@/app/actions";
import Submit from "@/components/Submit";
import { Avatar } from "@/components/ui";
import type { Fit } from "@/lib/match";
import type { Offer, PrintRequest, PublicUser } from "@/lib/types";

type Sort = "fit" | "price" | "eta";

export default function OffersPanel({
  r,
  offers,
  people,
  fits,
}: {
  r: PrintRequest;
  offers: Offer[];
  people: Record<string, PublicUser>;
  fits: Record<string, Fit>;
}) {
  const [state, action] = useActionState(acceptOfferAction, undefined);
  const [sort, setSort] = useState<Sort>("fit");
  const [confirm, setConfirm] = useState<string | null>(null);
  const live = offers.filter((o) => o.status === "pending");
  const best = {
    price: Math.min(...live.map((o) => o.price)),
    eta: live.map((o) => o.eta).sort()[0],
  };
  const sorted = [...live].sort((a, b) =>
    sort === "price" ? a.price - b.price : sort === "eta" ? a.eta.localeCompare(b.eta) : (fits[b.makerId]?.score ?? 0) - (fits[a.makerId]?.score ?? 0) || a.price - b.price,
  );

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="mono">Oferty drukarzy · {live.length}</span>
        {live.length > 1 && (
          <div className="seg-mini" role="group" aria-label="Sortuj oferty">
            {([["fit", "Dopasowanie"], ["price", "Cena"], ["eta", "Termin"]] as [Sort, string][]).map(([k, l]) => (
              <button key={k} type="button" aria-pressed={sort === k} onClick={() => setSort(k)}>{l}</button>
            ))}
          </div>
        )}
      </div>
      <div className="panel-body">
        {live.length === 0 ? (
          <div className="offers-empty">
            <span className="pulse" />
            <div>
              <b>Czekamy na oferty</b>
              <p className="muted">Drukarze widzą zlecenie w zakładce Zlecenia. Najlepiej dopasowani dostali zaproszenie — zwykle pierwsze oferty przychodzą w ciągu kilku godzin.</p>
            </div>
          </div>
        ) : (
          <div className="offers">
            {sorted.map((o, i) => {
              const u = people[o.makerId];
              const f = fits[o.makerId];
              return (
                <div key={o.id} className="offer" style={{ ["--i" as string]: i }}>
                  <div className="offer-who">
                    {u && <Avatar name={u.name} src={u.avatar} />}
                    <div style={{ minWidth: 0 }}>
                      <Link href={`/drukarze/${o.makerId}`} className="offer-name">{u?.name ?? "Drukarz"}</Link>
                      <div className="dim offer-sub">
                        {u?.city}
                        {u?.maker?.rating ? ` · ★ ${u.maker.rating.toFixed(2)}` : ""}
                        {u?.maker ? ` · ${u.maker.jobsDone} zleceń` : ""}
                      </div>
                    </div>
                    {f && <span className="fit-score" title={f.reasons.join(", ")}>{f.score}%</span>}
                  </div>
                  <div className="offer-nums">
                    <div>
                      <span className="mono dim">Cena</span>
                      <b>{o.price.toLocaleString("pl-PL")} zł</b>
                      {o.price === best.price && live.length > 1 && <span className="tag-fit">najtańsza</span>}
                    </div>
                    <div>
                      <span className="mono dim">Gotowe do</span>
                      <b>{new Date(o.eta + "T12:00").toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}</b>
                      {o.eta === best.eta && live.length > 1 && <span className="tag-fit">najszybciej</span>}
                      {r.deadline && o.eta > r.deadline && <span className="fit-warn">po Twoim terminie</span>}
                    </div>
                  </div>
                  {o.note && <p className="offer-note">{o.note}</p>}
                  {f && f.reasons.length > 0 && <div className="fit-why">{f.reasons.slice(0, 3).join(" · ")}</div>}
                  <form action={action} className="row" style={{ justifyContent: "flex-end" }}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="makerId" value={o.makerId} />
                    {confirm === o.makerId ? (
                      <>
                        <span className="muted" style={{ fontSize: 14 }}>Pozostałe oferty zostaną odrzucone.</span>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(null)}>Wróć</button>
                        <Submit className="btn btn-primary btn-sm" pendingText="Przyjmowanie…">Potwierdzam — {o.price} zł</Submit>
                      </>
                    ) : (
                      <button type="button" className="btn btn-go btn-sm" onClick={() => setConfirm(o.makerId)}>Przyjmij ofertę</button>
                    )}
                  </form>
                </div>
              );
            })}
          </div>
        )}
        {state?.error && <div className="alert" role="alert" style={{ marginTop: 12 }}>{state.error}</div>}
      </div>
    </div>
  );
}
