"use client";
import { useActionState, useState } from "react";
import { createRequestAction } from "@/app/actions";
import Submit from "@/components/Submit";
import { Avatar } from "@/components/ui";
import { MATERIALS, type PublicUser } from "@/lib/types";

export default function NewRequestForm({ makers, initialMaker }: { makers: PublicUser[]; initialMaker?: string }) {
  const [state, action] = useActionState(createRequestAction, undefined);
  const [makerId, setMakerId] = useState(initialMaker ?? "");
  const [material, setMaterial] = useState("");
  const maker = makers.find((m) => m.id === makerId);
  const supported = !material || !maker || maker.maker!.materials.includes(material);
  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  return (
    <form action={action} className="two-col">
      <div className="stack">
        <div className="panel">
          <div className="panel-head"><span className="mono">01 · Model</span></div>
          <div className="panel-body form">
            <div className="field">
              <label htmlFor="title">Tytuł zlecenia</label>
              <input className="input" id="title" name="title" placeholder="np. Obudowa do czujnika temperatury" required maxLength={120} />
            </div>
            <div className="field">
              <label htmlFor="description">Opis</label>
              <textarea className="textarea" id="description" name="description" required placeholder="Do czego służy część, na co zwrócić uwagę, wymagane tolerancje, wykończenie…" />
            </div>
            <div className="field">
              <label htmlFor="fileUrl">Link do pliku (STL / STEP / 3MF)</label>
              <input className="input" id="fileUrl" name="fileUrl" type="url" placeholder="https://…  (Printables, Google Drive, Dropbox)" />
              <span className="hint">Wklej link do modelu — drukarz pobierze go przed wyceną.</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><span className="mono">02 · Parametry druku</span></div>
          <div className="panel-body form">
            <div className="form-grid">
              <div className="field">
                <label htmlFor="material">Materiał</label>
                <select className="select" id="material" name="material" required value={material} onChange={(e) => setMaterial(e.target.value)}>
                  <option value="" disabled>Wybierz…</option>
                  {MATERIALS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="color">Kolor</label>
                <input className="input" id="color" name="color" placeholder="np. Czarny mat" />
              </div>
            </div>
            {!supported && (
              <div className="banner warn">
                {maker!.name} nie ma {material} w ofercie. Możesz wysłać zapytanie mimo to — drukarz może poprosić o pomoc kogoś, kto go ma.
              </div>
            )}
            <div className="form-grid three">
              <div className="field">
                <label htmlFor="quantity">Ilość (szt.)</label>
                <input className="input" id="quantity" name="quantity" type="number" min={1} max={10000} defaultValue={1} />
              </div>
              <div className="field">
                <label htmlFor="infill">Wypełnienie (%)</label>
                <input className="input" id="infill" name="infill" type="number" min={0} max={100} defaultValue={20} />
              </div>
              <div className="field">
                <label htmlFor="layerHeight">Warstwa (mm)</label>
                <select className="select" id="layerHeight" name="layerHeight" defaultValue="0.2">
                  {["0.05", "0.08", "0.12", "0.16", "0.2", "0.24", "0.28"].map((v) => <option key={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="dims">Wymiary (X × Y × Z)</label>
              <input className="input" id="dims" name="dims" placeholder="np. 120 × 80 × 40 mm" />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><span className="mono">03 · Termin i budżet</span></div>
          <div className="panel-body form-grid">
            <div className="field">
              <label htmlFor="deadline">Termin</label>
              <input className="input" id="deadline" name="deadline" type="date" min={minDate} />
            </div>
            <div className="field">
              <label htmlFor="budget">Budżet (zł, opcjonalnie)</label>
              <input className="input" id="budget" name="budget" type="number" min={0} step={1} placeholder="np. 150" />
            </div>
          </div>
        </div>
      </div>

      <aside className="panel sticky">
        <div className="panel-head"><span className="mono">Drukarz</span></div>
        <div className="panel-body form">
          <div className="field">
            <label htmlFor="makerId">Wyślij do</label>
            <select className="select" id="makerId" name="makerId" value={makerId} onChange={(e) => setMakerId(e.target.value)} required>
              {makers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.city}{m.maker!.available ? "" : " (zajęty)"}
                </option>
              ))}
            </select>
          </div>
          {maker && (
            <div key={maker.id} style={{ animation: "rowIn .4s var(--ease)" }}>
              <div className="row" style={{ marginBottom: 14 }}>
                <Avatar name={maker.name} src={maker.avatar} />
                <div>
                  <div>{maker.maker!.headline}</div>
                  <div className="mono dim">~{maker.maker!.leadDays} dni · {maker.maker!.hourlyRate} zł/h</div>
                </div>
              </div>
              <div className="chips">{maker.maker!.materials.map((m) => <span key={m} className="chip" style={m === material ? { borderColor: "var(--accent)", color: "var(--accent)" } : undefined}>{m}</span>)}</div>
            </div>
          )}
          <div className="banner" style={{ marginTop: 4 }}>
            Drukarz może przyjąć zapytanie, odrzucić je lub poprosić innego drukarza o pomoc. O każdej decyzji zobaczysz informację w panelu.
          </div>
          {state?.error && <div className="alert" role="alert">{state.error}</div>}
          <Submit className="btn btn-primary btn-lg" pendingText="Wysyłanie…">Wyślij zapytanie</Submit>
        </div>
      </aside>
    </form>
  );
}
