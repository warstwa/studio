"use client";
import { useActionState, useRef, useState } from "react";
import { deleteOrderAction, saveOrderAction } from "@/app/actions";
import FileDrop from "@/components/FileDrop";
import Submit from "@/components/Submit";
import { MATERIALS, type PrintRequest } from "@/lib/types";

export default function OrderEditor({ r, blob, userId }: { r: PrintRequest; blob: boolean; userId: string }) {
  const [state, action] = useActionState(saveOrderAction, undefined);
  const [cState, cAction] = useActionState(deleteOrderAction, undefined);
  const [busy, setBusy] = useState(false);
  const [delivery, setDelivery] = useState(r.delivery ?? "shipping");
  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const draft = r.status === "draft";
  // przycisk ustawia intencję synchronicznie przed wysłaniem formularza
  const intent = useRef<HTMLInputElement>(null);
  const setIntent = (v: string) => () => {
    if (intent.current) intent.current.value = v;
  };

  return (
    <>
      {/* key: po każdym zapisie formularz startuje od zapisanych wartości (React 19 resetuje formularz po akcji) */}
      <form action={action} className="stack" key={r.updatedAt}>
        <input type="hidden" name="id" value={r.id} />
        <input type="hidden" name="intent" ref={intent} defaultValue="save" />
        <div className="panel">
          <div className="panel-head"><span className="mono">Co drukujemy</span></div>
          <div className="panel-body form">
            <div className="field">
              <label htmlFor="title">Tytuł zlecenia</label>
              <input className="input" id="title" name="title" defaultValue={r.title} maxLength={120} required />
            </div>
            <div className="field">
              <label htmlFor="description">Opis</label>
              <textarea className="textarea" id="description" name="description" defaultValue={r.description}
                placeholder="Do czego służy wydruk, wymagane tolerancje, wykończenie, czy części mają do siebie pasować…" />
            </div>
            <div className="field">
              <span className="label">Pliki i zdjęcia</span>
              <span className="hint">Modele, rysunki, zdjęcia albo wizualizacje — pierwsze zdjęcie będzie okładką zlecenia na giełdzie.</span>
              <FileDrop blob={blob} userId={userId} initial={r.files ?? []} onBusy={setBusy} />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><span className="mono">Parametry druku</span>{r.slicer && <span className="mono dim">wstępnie z kalkulatora</span>}</div>
          <div className="panel-body form">
            <div className="form-grid">
              <div className="field">
                <label htmlFor="material">Materiał</label>
                <select className="select" id="material" name="material" defaultValue={r.material}>
                  {MATERIALS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="color">Kolor</label>
                <input className="input" id="color" name="color" defaultValue={r.color} maxLength={40} />
              </div>
            </div>
            <div className="form-grid three">
              <div className="field">
                <label htmlFor="quantity">Ilość (szt.)</label>
                <input className="input" id="quantity" name="quantity" type="number" min={1} max={10000} defaultValue={r.quantity} />
              </div>
              <div className="field">
                <label htmlFor="infill">Wypełnienie (%)</label>
                <input className="input" id="infill" name="infill" type="number" min={0} max={100} defaultValue={r.infill} />
              </div>
              <div className="field">
                <label htmlFor="layerHeight">Warstwa (mm)</label>
                <select className="select" id="layerHeight" name="layerHeight" defaultValue={String(r.layerHeight)}>
                  {["0.05", "0.08", "0.12", "0.16", "0.2", "0.24", "0.28"].map((v) => <option key={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="dims">Wymiary (X × Y × Z)</label>
              <input className="input" id="dims" name="dims" defaultValue={r.dims === "—" ? "" : r.dims} placeholder="np. 120 × 80 × 40 mm" />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><span className="mono">Termin, budżet, odbiór</span></div>
          <div className="panel-body form">
            <div className="form-grid">
              <div className="field">
                <label htmlFor="deadline">Potrzebuję do</label>
                <input className="input" id="deadline" name="deadline" type="date" min={minDate} defaultValue={r.deadline} />
              </div>
              <div className="field">
                <label htmlFor="budget">Budżet (zł, opcjonalnie)</label>
                <input className="input" id="budget" name="budget" type="number" min={0} defaultValue={r.budget} placeholder="np. 150" />
              </div>
            </div>
            <div className="seg" role="radiogroup" aria-label="Sposób odbioru">
              <label>
                <input type="radio" name="delivery" value="shipping" checked={delivery === "shipping"} onChange={() => setDelivery("shipping")} />
                <b>Wysyłka</b>
                <span>kurier lub paczkomat</span>
              </label>
              <label>
                <input type="radio" name="delivery" value="pickup" checked={delivery === "pickup"} onChange={() => setDelivery("pickup")} />
                <b>Odbiór osobisty</b>
                <span>preferuję drukarza z mojego miasta</span>
              </label>
            </div>
            <div className="field">
              <label htmlFor="city">Miasto</label>
              <input className="input" id="city" name="city" defaultValue={r.city} maxLength={60} />
            </div>
          </div>
        </div>

        {state?.error && <div className="alert" role="alert">{state.error}</div>}
        {state?.ok && <div className="alert ok" role="status">Zapisano zmiany.</div>}
        <div className="order-actions">
          {draft ? (
            <>
              <Submit onClick={setIntent("save")} className="btn btn-lg" pendingText="Zapisywanie…" disabled={busy}>Zapisz szkic</Submit>
              <Submit onClick={setIntent("publish")} className="btn btn-primary btn-lg" pendingText="Wysyłanie…" disabled={busy}>
                {busy ? "Trwa wysyłanie plików…" : "Wyślij zlecenie do drukarzy →"}
              </Submit>
            </>
          ) : (
            <Submit onClick={setIntent("done")} className="btn btn-primary btn-lg" pendingText="Zapisywanie…" disabled={busy}>Zapisz zmiany</Submit>
          )}
        </div>
      </form>
      <form action={cAction} className="row" style={{ justifyContent: "flex-end" }}>
        <input type="hidden" name="id" value={r.id} />
        {cState?.error && <span className="alert">{cState.error}</span>}
        <Submit className="btn btn-ghost btn-sm" pendingText="…">{draft ? "Usuń szkic" : "Anuluj zlecenie"}</Submit>
      </form>
    </>
  );
}
