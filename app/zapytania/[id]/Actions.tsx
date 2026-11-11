"use client";
import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  approveStepAction,
  advanceAction,
  offerAction,
  withdrawOfferAction,
  cancelAction,
  completeAction,
  decideAction,
  reassignAction,
  type FormState,
} from "@/app/actions";
import Submit from "@/components/Submit";
import ImageAttach from "@/components/ImageAttach";
import Gallery from "@/components/Gallery";
import { STEP_LABEL } from "@/lib/format";
import type { Offer, PrintRequest, PublicUser } from "@/lib/types";

type Helper = PublicUser & { involved: boolean };

function useToast(state: FormState, msg: string) {
  const [toast, setToast] = useState<{ k: number; m: string } | null>(null);
  useEffect(() => {
    if (state?.ok) setToast({ k: Date.now(), m: msg });
  }, [state, msg]);
  return toast ? <div className="toast" key={toast.k}>{toast.m}</div> : null;
}

export default function Actions({
  r,
  isMaker,
  isOwner,
  helpers,
  reassignTo,
  openChildren,
  viewerIsMaker = false,
  myOffer = null,
  isClient = false,
  makerName = "Drukarz",
  blob = false,
  userId = "",
}: {
  r: PrintRequest;
  isMaker: boolean;
  isOwner: boolean;
  helpers: Helper[];
  reassignTo: PublicUser[];
  openChildren: number;
  viewerIsMaker?: boolean;
  myOffer?: Offer | null;
  isClient?: boolean;
  makerName?: string;
  blob?: boolean;
  userId?: string;
}) {
  if (r.status === "open") {
    if (isOwner) return <OwnerOpen r={r} />;
    if (viewerIsMaker) return <OfferForm r={r} mine={myOffer} />;
    return <Info r={r} isMaker={false} />;
  }
  // krok zgłoszony przez drukarza czeka na zamawiającego
  if (r.approval) {
    if (isClient) return <Approve r={r} makerName={makerName} />;
    if (isMaker) return <Waiting r={r} />;
  }
  if (isMaker && (r.status === "pending" || r.status === "help_requested"))
    return <Decide r={r} helpers={helpers} openChildren={openChildren} />;
  if (isMaker && (r.status === "accepted" || r.status === "printing"))
    return <Progress r={r} helpers={helpers} blob={blob} userId={userId} />;
  if (isClient && r.status === "ready") return <Complete r={r} />;
  if (isOwner && r.status === "rejected" && !r.parentId) return <Reassign r={r} makers={reassignTo} />;
  if (isOwner && (r.status === "pending" || r.status === "help_requested")) return <Cancel r={r} />;
  return <Info r={r} isMaker={isMaker} />;
}

/* ───────── decyzja drukarza ───────── */

type Choice = "accept" | "help" | "reject";

function Decide({ r, helpers, openChildren }: { r: PrintRequest; helpers: Helper[]; openChildren: number }) {
  const [state, action] = useActionState(decideAction, undefined);
  const [choice, setChoice] = useState<Choice | null>(null);
  const toast = useToast(state, choice === "help" ? "Prośba o pomoc wysłana" : "Zapisano decyzję");
  const waiting = r.status === "help_requested";
  useEffect(() => {
    if (state?.ok) setChoice(null);
  }, [state]);

  return (
    <div className="panel">
      {toast}
      <div className="panel-head">
        <span className="mono">{waiting ? "Czekasz na pomoc" : "Twoja decyzja"}</span>
        <span className="mono dim">{r.code}</span>
      </div>
      <form action={action} className="panel-body decide">
        <input type="hidden" name="id" value={r.id} />
        <input type="hidden" name="decision" value={choice ?? ""} />
        {waiting && (
          <p className="muted" style={{ fontSize: 14, marginBottom: 6 }}>
            {openChildren > 0
              ? `Oczekujesz na odpowiedź (${openChildren}). Możesz też przyjąć zlecenie samodzielnie, poprosić kogoś jeszcze albo odrzucić.`
              : "Pomocnik odmówił. Poproś kogoś innego, przyjmij zlecenie samodzielnie albo odrzuć."}
          </p>
        )}
        <div className="decide-choices">
          <ChoiceBtn kind="go" on={choice === "accept"} onClick={() => setChoice("accept")} title={waiting ? "Przyjmij samodzielnie" : "Akceptuj"} sub="Wycena i termin — do akceptacji klienta">
            <path d="M3 9l4 4 8-8" />
          </ChoiceBtn>
          <ChoiceBtn kind="help" on={choice === "help"} onClick={() => setChoice("help")} title="Poproś o pomoc" sub="Utwórz zapytanie do innego drukarza">
            <path d="M6 8a3 3 0 100-6 3 3 0 000 6zM13 8a3 3 0 100-6 3 3 0 000 6zM1 16c0-3 2-5 5-5s5 2 5 5M11 13c.5-1.3 1.3-2 2-2 2.5 0 4 2 4 5" />
          </ChoiceBtn>
          <ChoiceBtn kind="stop" on={choice === "reject"} onClick={() => setChoice("reject")} title="Odrzuć" sub="Krótko napisz dlaczego">
            <path d="M4 4l10 10M14 4L4 14" />
          </ChoiceBtn>
        </div>

        <div className={`expand${choice === "accept" ? " open" : ""}`}>
          <div>
            {choice === "accept" && (
              <div className="expand-inner">
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="quote">Wycena (zł)</label>
                    <input className="input" id="quote" name="quote" type="number" min={1} required placeholder={r.budget ? String(r.budget) : "np. 120"} />
                  </div>
                  <div className="field">
                    <label htmlFor="eta">Gotowe do</label>
                    <input className="input" id="eta" name="eta" type="date" defaultValue={r.deadline} />
                  </div>
                </div>
                <textarea className="textarea" name="note" placeholder="Wiadomość do zamawiającego (opcjonalnie)" style={{ minHeight: 80 }} />
                <Submit className="btn btn-go" pendingText="Wysyłanie…">Wyślij wycenę do akceptacji</Submit>
                <p className="hint">Zlecenie ruszy, gdy zamawiający zaakceptuje wycenę.</p>
              </div>
            )}
          </div>
        </div>

        <div className={`expand${choice === "help" ? " open" : ""}`}>
          <div>
            {choice === "help" && (
              <div className="expand-inner">
                <div className="field">
                  <label htmlFor="helperId">Kogo prosisz?</label>
                  <select className="select" id="helperId" name="helperId" required defaultValue="">
                    <option value="" disabled>Wybierz drukarza…</option>
                    {helpers.map((h) => (
                      <option key={h.id} value={h.id} disabled={h.involved}>
                        {h.name} — {h.city}
                        {h.maker!.materials.includes(r.material) ? ` · ma ${r.material}` : ""}
                        {h.involved ? " (już w zleceniu)" : !h.maker!.available ? " (zajęty)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="quantity">Ile sztuk przekazujesz?</label>
                  <input className="input" id="quantity" name="quantity" type="number" min={1} max={r.quantity} defaultValue={Math.max(1, Math.floor(r.quantity / 2))} />
                  <span className="hint">Z {r.quantity} szt. w zleceniu. Resztę drukujesz sam(a).</span>
                </div>
                <textarea className="textarea" name="note" placeholder="Co jest do zrobienia, w czym potrzebujesz pomocy…" style={{ minHeight: 80 }} />
                <Submit className="btn btn-help" pendingText="Wysyłanie…">Wyślij prośbę o pomoc</Submit>
              </div>
            )}
          </div>
        </div>

        <div className={`expand${choice === "reject" ? " open" : ""}`}>
          <div>
            {choice === "reject" && (
              <div className="expand-inner">
                <textarea className="textarea" name="note" placeholder="Powód (np. brak materiału, termin nierealny) — zamawiający to zobaczy" style={{ minHeight: 80 }} />
                <Submit className="btn btn-stop" pendingText="Zapisywanie…">Odrzuć zapytanie</Submit>
              </div>
            )}
          </div>
        </div>

        {state?.error && <div className="alert" role="alert">{state.error}</div>}
      </form>
    </div>
  );
}

function ChoiceBtn({
  kind,
  on,
  onClick,
  title,
  sub,
  children,
}: {
  kind: "go" | "help" | "stop";
  on: boolean;
  onClick: () => void;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={`choice ${kind}`} aria-pressed={on} onClick={onClick}>
      <span className="ic">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          {children}
        </svg>
      </span>
      <span>
        <b>{title}</b>
        <small>{sub}</small>
      </span>
    </button>
  );
}

/* ───────── realizacja ───────── */

function Progress({ r, helpers, blob, userId }: { r: PrintRequest; helpers: Helper[]; blob: boolean; userId: string }) {
  const [state, action] = useActionState(advanceAction, undefined);
  const [helpState, helpAction] = useActionState(decideAction, undefined);
  const [showHelp, setShowHelp] = useState(false);
  const toast = useToast(state, "Zgłoszono do akceptacji zamawiającego");
  const [busy, setBusy] = useState(false);
  const helpToast = useToast(helpState, "Prośba o pomoc wysłana");
  const next = r.status === "accepted" ? "Zgłoś start druku" : "Zgłoś wysyłkę do zamawiającego";
  return (
    <div className="panel">
      {toast}
      {helpToast}
      <div className="panel-head">
        <span className="mono">Realizacja</span>
        <span className="mono dim">{r.code}</span>
      </div>
      <div className="panel-body decide">
        <form action={action} className="decide">
          <input type="hidden" name="id" value={r.id} />
          {r.parentId && (
            <div className="banner">Swoją część wysyłasz bezpośrednio do zamawiającego{r.city ? ` (${r.city}${r.delivery === "pickup" ? ", odbiór osobisty" : ""})` : ""}.</div>
          )}
          <textarea className="textarea" name="note" style={{ minHeight: 70 }}
            placeholder={r.status === "printing" ? "Numer przesyłki, sposób dostawy…" : "Informacja dla zamawiającego (opcjonalnie)"} />
          <ImageAttach name="images" blob={blob} userId={userId} max={8} label={r.status === "printing" ? "Zdjęcia gotowego wydruku" : "Zdjęcia (opcjonalnie)"} onBusy={setBusy} />
          <Submit className="btn btn-primary" pendingText="Wysyłanie…" disabled={busy}>{next}</Submit>
          <p className="hint">Każdy krok akceptuje zamawiający.</p>
          {state?.error && <div className="alert" role="alert">{state.error}</div>}
        </form>
        <button type="button" className="btn btn-help" onClick={() => setShowHelp(!showHelp)} aria-expanded={showHelp}>
          Poproś o pomoc przy tym zleceniu
        </button>
        <div className={`expand${showHelp ? " open" : ""}`}>
          <div>
            <form action={helpAction} className="expand-inner">
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="decision" value="help" />
              <select className="select" name="helperId" required defaultValue="" aria-label="Drukarz">
                <option value="" disabled>Wybierz drukarza…</option>
                {helpers.map((h) => (
                  <option key={h.id} value={h.id} disabled={h.involved}>
                    {h.name} — {h.city}{h.involved ? " (już w zleceniu)" : ""}
                  </option>
                ))}
              </select>
              <input className="input" name="quantity" type="number" min={1} max={r.quantity} defaultValue={Math.max(1, Math.floor(r.quantity / 2))} aria-label="Ilość sztuk" />
              <textarea className="textarea" name="note" placeholder="W czym potrzebujesz pomocy?" style={{ minHeight: 70 }} />
              <Submit className="btn btn-help" pendingText="Wysyłanie…">Wyślij prośbę</Submit>
              {helpState?.error && <div className="alert" role="alert">{helpState.error}</div>}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function Complete({ r }: { r: PrintRequest }) {
  const [state, action] = useActionState(completeAction, undefined);
  const toast = useToast(state, "Dziękujemy! Zlecenie zakończone.");
  return (
    <div className="panel">
      {toast}
      <div className="panel-head"><span className="mono">Odbiór</span></div>
      <form action={action} className="panel-body decide">
        <input type="hidden" name="id" value={r.id} />
        <p className="muted" style={{ fontSize: 14 }}>
          Drukarz oznaczył zlecenie jako gotowe. Gdy wydruk do Ciebie dotrze, potwierdź odbiór.
        </p>
        <Submit className="btn btn-primary" pendingText="Zapisywanie…">Potwierdzam odbiór</Submit>
        {state?.error && <div className="alert" role="alert">{state.error}</div>}
      </form>
    </div>
  );
}

function Reassign({ r, makers }: { r: PrintRequest; makers: PublicUser[] }) {
  const [state, action] = useActionState(reassignAction, undefined);
  const [cState, cAction] = useActionState(cancelAction, undefined);
  const toast = useToast(state, "Zapytanie wysłane do kolejnego drukarza");
  const sorted = [...makers].sort(
    (a, b) => Number(b.maker!.materials.includes(r.material)) - Number(a.maker!.materials.includes(r.material)),
  );
  return (
    <div className="panel">
      {toast}
      <div className="panel-head"><span className="mono">Zapytanie odrzucone</span></div>
      <div className="panel-body decide">
        <form action={action} className="decide">
          <input type="hidden" name="id" value={r.id} />
          <p className="muted" style={{ fontSize: 14 }}>Wyślij to samo zapytanie do innego drukarza — bez wypełniania formularza od nowa.</p>
          <select className="select" name="makerId" required defaultValue="" aria-label="Drukarz">
            <option value="" disabled>Wybierz drukarza…</option>
            {sorted.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {m.city}{m.maker!.materials.includes(r.material) ? ` · ma ${r.material}` : ""}
              </option>
            ))}
          </select>
          <Submit className="btn btn-primary" pendingText="Wysyłanie…">Wyślij ponownie</Submit>
          {state?.error && <div className="alert" role="alert">{state.error}</div>}
        </form>
        <form action={cAction}>
          <input type="hidden" name="id" value={r.id} />
          <Submit className="btn btn-ghost" pendingText="…" style={{ width: "100%" }}>Zamknij zapytanie</Submit>
          {cState?.error && <div className="alert" role="alert">{cState.error}</div>}
        </form>
      </div>
    </div>
  );
}

function Cancel({ r }: { r: PrintRequest }) {
  const [state, action] = useActionState(cancelAction, undefined);
  const [sure, setSure] = useState(false);
  return (
    <div className="panel">
      <div className="panel-head"><span className="mono">Status</span></div>
      <div className="panel-body decide">
        <p className="muted" style={{ fontSize: 14 }}>
          {r.parentId ? "Prośba o pomoc czeka na odpowiedź drukarza." : "Zapytanie czeka na decyzję drukarza. Dostaniesz informację w panelu, gdy odpowie."}
        </p>
        {sure ? (
          <form action={action} className="row">
            <input type="hidden" name="id" value={r.id} />
            <Submit className="btn btn-stop btn-sm" pendingText="…">Tak, anuluj</Submit>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSure(false)}>Nie</button>
          </form>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => setSure(true)}>
            {r.parentId ? "Wycofaj prośbę" : "Anuluj zapytanie"}
          </button>
        )}
        {state?.error && <div className="alert" role="alert">{state.error}</div>}
      </div>
    </div>
  );
}

/* ───────── akceptacja kroków przez zamawiającego ───────── */

function Approve({ r, makerName }: { r: PrintRequest; makerName: string }) {
  const [state, action] = useActionState(approveStepAction, undefined);
  const [rejecting, setRejecting] = useState(false);
  const a = r.approval!;
  const toast = useToast(state, "Zapisano decyzję");
  return (
    <div className="panel approval">
      {toast}
      <div className="panel-head">
        <span className="mono">Do Twojej akceptacji</span>
        <span className="mono dim">{r.code}</span>
      </div>
      <div className="panel-body decide">
        <p style={{ fontSize: 15 }}>
          <b>{makerName}</b> zgłasza {STEP_LABEL[a.to] ?? a.to}.
        </p>
        {a.to === "accepted" && (
          <div className="offer-mine">
            <div><span className="mono dim">Wycena</span><b>{a.quote?.toLocaleString("pl-PL")} zł</b></div>
            <div><span className="mono dim">Gotowe do</span><b>{a.eta ? new Date(a.eta + "T12:00").toLocaleDateString("pl-PL", { day: "numeric", month: "short" }) : "—"}</b></div>
          </div>
        )}
        {a.note && <p className="offer-note">{a.note}</p>}
        {a.images && a.images.length > 0 && <Gallery images={a.images} variant="strip" />}
        <form action={action} className="decide">
          <input type="hidden" name="id" value={r.id} />
          {rejecting ? (
            <>
              <input type="hidden" name="decision" value="reject" />
              <textarea className="textarea" name="note" style={{ minHeight: 80 }} placeholder="Co trzeba poprawić? Drukarz zobaczy Twój komentarz." />
              <div className="row">
                <Submit className="btn btn-stop" pendingText="…">Nie akceptuję</Submit>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRejecting(false)}>Wróć</button>
              </div>
            </>
          ) : (
            <>
              <input type="hidden" name="decision" value="approve" />
              <Submit className="btn btn-go" pendingText="Zapisywanie…">Akceptuję</Submit>
              <button type="button" className="btn btn-ghost" onClick={() => setRejecting(true)}>Nie akceptuję…</button>
            </>
          )}
          {state?.error && <div className="alert" role="alert">{state.error}</div>}
        </form>
      </div>
    </div>
  );
}

function Waiting({ r }: { r: PrintRequest }) {
  return (
    <div className="panel">
      <div className="panel-head"><span className="mono">Czeka na zamawiającego</span><span className="mono dim">{r.code}</span></div>
      <div className="panel-body decide">
        <div className="offers-empty">
          <span className="pulse" />
          <p className="muted" style={{ fontSize: 14 }}>
            Zgłosiłeś {STEP_LABEL[r.approval!.to] ?? "krok"}. Zamawiający musi to zaakceptować — dostaniesz odpowiedź w historii zlecenia.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ───────── giełda: oferta drukarza ───────── */

function OfferForm({ r, mine }: { r: PrintRequest; mine: Offer | null }) {
  const [state, action] = useActionState(offerAction, undefined);
  const [wState, wAction] = useActionState(withdrawOfferAction, undefined);
  const [edit, setEdit] = useState(!mine || mine.status !== "pending");
  const toast = useToast(state, mine ? "Oferta zaktualizowana" : "Oferta wysłana do zamawiającego");
  useEffect(() => {
    if (state?.ok) setEdit(false);
  }, [state]);
  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const declined = mine?.status === "declined";

  return (
    <div className="panel">
      {toast}
      <div className="panel-head">
        <span className="mono">{mine?.status === "pending" ? "Twoja oferta" : "Złóż ofertę"}</span>
        <span className="mono dim">{r.code}</span>
      </div>
      <div className="panel-body decide">
        {declined ? (
          <p className="muted" style={{ fontSize: 14 }}>Zamawiający wybrał inną ofertę.</p>
        ) : mine?.status === "pending" && !edit ? (
          <>
            <div className="offer-mine">
              <div><span className="mono dim">Cena{mine.quantity ? ` · ${mine.quantity} szt.` : ""}</span><b>{mine.price.toLocaleString("pl-PL")} zł</b></div>
              <div><span className="mono dim">Gotowe do</span><b>{new Date(mine.eta + "T12:00").toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}</b></div>
            </div>
            {mine.note && <p className="offer-note">{mine.note}</p>}
            <p className="hint">Zamawiający widzi Twoją ofertę. Dostaniesz zlecenie, gdy ją przyjmie.</p>
            <div className="row">
              <button type="button" className="btn btn-sm" onClick={() => setEdit(true)}>Zmień ofertę</button>
              <form action={wAction}>
                <input type="hidden" name="id" value={r.id} />
                <Submit className="btn btn-ghost btn-sm" pendingText="…">Wycofaj</Submit>
              </form>
            </div>
            {wState?.error && <div className="alert" role="alert">{wState.error}</div>}
          </>
        ) : (
          <form action={action} className="decide">
            <input type="hidden" name="id" value={r.id} />
            <div className="form-grid">
              <div className="field">
                <label htmlFor="price">Cena za Twoje sztuki (zł)</label>
                <input className="input" id="price" name="price" type="number" min={1} step="0.01" required defaultValue={mine?.price}
                  placeholder={r.budget ? `budżet ${r.budget}` : "np. 120"} />
              </div>
              <div className="field">
                <label htmlFor="eta">Gotowe do</label>
                <input className="input" id="eta" name="eta" type="date" min={minDate} required defaultValue={mine?.eta ?? r.deadline} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="o-qty">Ile sztuk wydrukujesz?</label>
              <input className="input" id="o-qty" name="quantity" type="number" min={1} max={r.quantity} defaultValue={mine?.quantity ?? r.quantity} />
              <span className="hint">Zamówienie ma {r.quantity} szt. Możesz zaoferować część — zamawiający podzieli zlecenie między drukarzy.</span>
            </div>
            <textarea className="textarea" name="note" defaultValue={mine?.note} style={{ minHeight: 90 }}
              placeholder="Jak wydrukujesz zlecenie: maszyna, materiał, wysyłka, pytania do zamawiającego…" />
            {r.budget ? <p className="hint">Budżet zamawiającego: do {r.budget} zł.</p> : null}
            <Submit className="btn btn-primary" pendingText="Wysyłanie…">{mine?.status === "pending" ? "Zapisz zmiany" : "Wyślij ofertę"}</Submit>
            {mine?.status === "pending" && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEdit(false)}>Anuluj</button>}
            {state?.error && <div className="alert" role="alert">{state.error}</div>}
          </form>
        )}
      </div>
    </div>
  );
}

function OwnerOpen({ r }: { r: PrintRequest }) {
  const [state, action] = useActionState(cancelAction, undefined);
  const [sure, setSure] = useState(false);
  return (
    <div className="panel">
      <div className="panel-head"><span className="mono">Twoje zlecenie</span><span className="mono dim">{r.code}</span></div>
      <div className="panel-body decide">
        <p className="muted" style={{ fontSize: 14 }}>
          Zlecenie jest na giełdzie. Porównaj oferty po lewej i przyjmij jedną — wtedy drukarz zaczyna pracę.
        </p>
        <Link href={`/zamow/${r.id}`} className="btn">Edytuj szczegóły</Link>
        {sure ? (
          <form action={action} className="row">
            <input type="hidden" name="id" value={r.id} />
            <Submit className="btn btn-stop btn-sm" pendingText="…">Tak, anuluj zlecenie</Submit>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSure(false)}>Nie</button>
          </form>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => setSure(true)}>Anuluj zlecenie</button>
        )}
        {state?.error && <div className="alert" role="alert">{state.error}</div>}
      </div>
    </div>
  );
}

function Info({ r, isMaker }: { r: PrintRequest; isMaker: boolean }) {
  const text: Record<string, string> = {
    draft: "Szkic zamówienia.",
    open: "Zlecenie zbiera oferty od drukarzy.",
    pending: "Zapytanie czeka na decyzję drukarza.",
    help_requested: "Drukarz szuka pomocy innego drukarza.",
    accepted: "Zlecenie przyjęte — wkrótce ruszy druk.",
    printing: "Trwa druk.",
    ready: isMaker ? "Wysłane — czekasz na potwierdzenie odbioru przez zamawiającego." : "Wydruk wysłany.",
    completed: "Zlecenie zakończone.",
    rejected: "Zapytanie zostało odrzucone.",
    cancelled: "Zapytanie anulowane.",
  };
  return (
    <div className="panel">
      <div className="panel-head"><span className="mono">Status</span></div>
      <div className="panel-body muted" style={{ fontSize: 14 }}>{text[r.status]}</div>
    </div>
  );
}
