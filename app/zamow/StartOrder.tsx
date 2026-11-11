"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { startOrderAction } from "@/app/actions";
import FileDrop from "@/components/FileDrop";
import Submit from "@/components/Submit";

type Kind = "file" | "idea";

export default function StartOrder({ blob, userId }: { blob: boolean; userId: string }) {
  const [kind, setKind] = useState<Kind>("file");
  const [busy, setBusy] = useState(false);
  const [state, action] = useActionState(startOrderAction, undefined);
  const [desc, setDesc] = useState("");

  return (
    <div className="stack">
      <div className="paths" role="radiogroup" aria-label="Jak chcesz złożyć zamówienie?">
        <PathCard on={kind === "file"} onClick={() => setKind("file")} n="01" title="Mam plik lub projekt" text="STL, 3MF, STEP, OBJ — albo kilka części naraz. Dodasz też zdjęcia i rysunki.">
          <path d="M8 4h14l8 8v24H8z" /><path d="M22 4v8h8" /><path d="M14 22h12M14 28h8" />
        </PathCard>
        <PathCard on={kind === "idea"} onClick={() => setKind("idea")} n="02" title="Mam pomysł" text="Nie masz modelu? Opisz, co ma powstać, dołącz szkic lub zdjęcie — drukarze pomogą go przygotować.">
          <path d="M20 5a10 10 0 0 0-6 18v5h12v-5a10 10 0 0 0-6-18z" /><path d="M15 33h10" />
        </PathCard>
        <Link href="/slicer" className="path-card">
          <span className="path-n mono">03</span>
          <svg width="34" height="34" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <path d="M6 30l14 7 14-7M6 24l14 7 14-7M6 18l14 7 14-7-14-7z" />
          </svg>
          <b>Policz w slicerze</b>
          <span>Wgraj model do kalkulatora, ustaw materiał i kolory, sprawdź czas i filament — potem „Dodaj do zamówienia”.</span>
          <span className="path-go">Otwórz slicer →</span>
        </Link>
      </div>

      <form action={action} className="panel" key={kind}>
        <input type="hidden" name="kind" value={kind} />
        <div className="panel-head">
          <span className="mono">{kind === "file" ? "Pliki do wydruku" : "Twój pomysł"}</span>
          <span className="mono dim">krok 1 z 2</span>
        </div>
        <div className="panel-body form">
          {kind === "file" ? (
            <>
              <FileDrop blob={blob} userId={userId} onBusy={setBusy} />
              <div className="field">
                <label htmlFor="description">Krótki opis (opcjonalnie)</label>
                <textarea className="textarea" id="description" name="description" style={{ minHeight: 90 }} placeholder="Do czego służy wydruk, na co zwrócić uwagę…" />
              </div>
            </>
          ) : (
            <>
              <div className="field">
                <label htmlFor="title">Co chcesz wydrukować?</label>
                <input className="input" id="title" name="title" maxLength={120} placeholder="np. Uchwyt na rower do ściany" />
              </div>
              <div className="field">
                <label htmlFor="description">Opis pomysłu</label>
                <textarea className="textarea" id="description" name="description" value={desc} onChange={(e) => setDesc(e.target.value)}
                  placeholder="Wymiary, do czego ma służyć, jakie obciążenia ma wytrzymać, jak ma wyglądać…" />
                <span className="hint">{desc.length < 20 ? `Jeszcze ${20 - desc.length} znaków` : "Świetnie — w następnym kroku dodasz szczegóły."}</span>
              </div>
              <div className="field">
                <span className="label">Szkic, zdjęcie lub inspiracja (opcjonalnie)</span>
                <FileDrop blob={blob} userId={userId} onBusy={setBusy} hint="Zdjęcia, rysunki, PDF albo model, który chcesz przerobić" />
              </div>
            </>
          )}
          {state?.error && <div className="alert" role="alert">{state.error}</div>}
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <Submit className="btn btn-primary btn-lg" pendingText="Tworzenie zamówienia…" disabled={busy}>
              {busy ? "Trwa wysyłanie plików…" : "Dalej: szczegóły zamówienia →"}
            </Submit>
          </div>
        </div>
      </form>
    </div>
  );
}

function PathCard({ on, onClick, n, title, text, children }: { on: boolean; onClick: () => void; n: string; title: string; text: string; children: React.ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={on} className={`path-card${on ? " on" : ""}`} onClick={onClick}>
      <span className="path-n mono">{n}</span>
      <svg width="34" height="34" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>{children}</svg>
      <b>{title}</b>
      <span>{text}</span>
    </button>
  );
}
