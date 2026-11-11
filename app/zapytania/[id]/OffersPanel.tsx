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
  // podział: ile sztuk przydzielamy każdemu drukarzowi (0 = nie wybrano)
  const [alloc, setAlloc] = useState<Record<string, number>>({});
  const live = offers.filter((o) => o.status === "pending");
  const total = r.quantity;
  const cap = (o: Offer) => Math.min(o.quantity ?? total, total);
  const assigned = Object.values(alloc).reduce((a, b) => a + b, 0);
  const unitPrice = (o: Offer) => o.price / (o.quantity ?? total);
  const cost = live.reduce((s, o) => s + (alloc[o.makerId] ? Math.round(unitPrice(o) * alloc[o.makerId]) : 0), 0);
  const toggle = (o: Offer) =>
    setAlloc((a) => {
      const n = { ...a };
      if (n[o.makerId]) delete n[o.makerId];
      else n[o.makerId] = Math.max(1, Math.min(cap(o), total - assigned)) || cap(o);
      return n;
    });
  const picks = Object.entries(alloc).filter(([, q]) => q > 0);
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
                      <span className="mono dim">Cena{o.quantity && o.quantity < r.quantity ? ` · za ${o.quantity} szt.` : ""}</span>
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
                  <div className="offer-pick">
                    <label className="check">
                      <input type="checkbox" checked={!!alloc[o.makerId]} onChange={() => toggle(o)} />
                      Wybierz{o.quantity && o.quantity < total ? ` (oferuje ${o.quantity} z ${total} szt.)` : ""}
                    </label>
                    {alloc[o.makerId] ? (
                      <span className="row" style={{ gap: 8 }}>
                        <input className="input input-sm qty" type="number" min={1} max={cap(o)} value={alloc[o.makerId]} aria-label={`Sztuki dla ${u?.name}`}
                          onChange={(e) => setAlloc((a) => ({ ...a, [o.makerId]: Math.max(1, Math.min(cap(o), Math.round(+e.target.value) || 1)) }))} />
                        <span className="dim">szt. · {Math.round(unitPrice(o) * alloc[o.makerId])} zł</span>
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {live.length > 0 && (
          <form action={action} className={`alloc-bar${assigned === total ? " ready" : ""}`}>
            <input type="hidden" name="id" value={r.id} />
            <input type="hidden" name="allocations" value={JSON.stringify(picks.map(([makerId, quantity]) => ({ makerId, quantity })))} />
            <div>
              <b>{assigned} / {total} szt.</b> przydzielone{picks.length > 1 ? ` · ${picks.length} drukarzy` : ""}
              {assigned > 0 && <span className="dim"> · łącznie {cost.toLocaleString("pl-PL")} zł</span>}
              <div className="hint">
                {assigned === 0
                  ? "Zaznacz ofertę. Możesz wybrać kilka i podzielić sztuki — każdy drukarz dostanie swoją część."
                  : assigned < total
                    ? `Brakuje ${total - assigned} szt. — wybierz kolejną ofertę albo zwiększ ilość.`
                    : assigned > total
                      ? `Za dużo o ${assigned - total} szt.`
                      : "Gotowe. Pozostałe oferty zostaną odrzucone."}
              </div>
            </div>
            <Submit className="btn btn-primary" pendingText="Przyjmowanie…" disabled={assigned !== total}>
              {picks.length > 1 ? "Przyjmij i podziel zamówienie" : "Przyjmij ofertę"}
            </Submit>
          </form>
        )}
        {state?.error && <div className="alert" role="alert" style={{ marginTop: 12 }}>{state.error}</div>}
      </div>
    </div>
  );
}
