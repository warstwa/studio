"use client";
import { useEffect, useRef, useState } from "react";

type Line = { t: string; tag?: string; tone?: "acc" | "dim" | "warn" };
const TABS: { id: string; label: string; title: string; lines: Line[] }[] = [
  {
    id: "zamowienie",
    label: "Zamówienie",
    title: "klient · uchwyt.3mf · 12 szt.",
    lines: [
      { t: "warstwa zamow --plik uchwyt.3mf --ilosc 12", tag: "$" },
      { t: "uchwyt.3mf · 2.4 MB · 3 obiekty", tag: "plik" },
      { t: "0.2 mm · PETG · 84 warstwy · 2 h 14 min / szt.", tag: "slicer" },
      { t: "materiał ✓  pole robocze ✓  termin ✓", tag: "best-fit", tone: "acc" },
      { t: "zaproszono 3 drukarzy · zlecenie widoczne na giełdzie", tag: "giełda" },
      { t: "Drukarz A · 68 zł · 3 dni · dopasowanie 94%", tag: "oferta", tone: "acc" },
      { t: "Drukarz B · 74 zł · 2 dni · dopasowanie 88%", tag: "oferta" },
      { t: "czeka na Twój wybór", tag: "status", tone: "warn" },
    ],
  },
  {
    id: "drukarz",
    label: "Drukarz",
    title: "drukarz · giełda · PETG",
    lines: [
      { t: "warstwa gielda --material PETG --miasto Kraków", tag: "$" },
      { t: "7 otwartych zleceń · 3 pasują do Twoich maszyn", tag: "filtr" },
      { t: "Uchwyt ×12 · PETG · termin 21.11", tag: "zlecenie" },
      { t: "wysłano: 68 zł · 3 dni · „drukuję na P1S”", tag: "oferta", tone: "acc" },
      { t: "oferta przyjęta · Ty 8 szt. · pomocnik 4 szt.", tag: "klient", tone: "acc" },
      { t: "W druku → czeka na akceptację klienta", tag: "etap", tone: "warn" },
      { t: "klient zaakceptował etap ✓", tag: "etap", tone: "acc" },
    ],
  },
  {
    id: "kalkulator",
    label: "Kalkulator",
    title: "slicer · uchwyt.3mf",
    lines: [
      { t: "warstwa slicer uchwyt.3mf --warstwa 0.2 --wypelnienie 15", tag: "$" },
      { t: "64 × 48 × 16.8 mm · 3 obiekty", tag: "model" },
      { t: "84 · grubość 0.20 mm", tag: "warstwy" },
      { t: "2 h 14 min / szt. · 26 h 48 min łącznie", tag: "czas" },
      { t: "38 g PETG / szt. · 456 g łącznie", tag: "materiał" },
      { t: "filament ≈ 36 zł · cenę ustala drukarz", tag: "koszt", tone: "dim" },
      { t: "→ Dodaj do zamówienia", tag: "gotowe", tone: "acc" },
    ],
  },
];

const CHAR_MS = 14;
const LINE_PAUSE = 260;
const TAB_HOLD = 2600;

export default function Terminal() {
  const [tab, setTab] = useState(0);
  const [shown, setShown] = useState<{ line: number; ch: number }>({ line: 0, ch: 0 });
  const [auto, setAuto] = useState(true);
  const [still, setStill] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const visible = useRef(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setStill(true);
    const io = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting));
    if (box.current) io.observe(box.current);
    return () => io.disconnect();
  }, []);

  const lines = TABS[tab].lines;
  const total = lines.length;
  const done = still || shown.line >= total;

  useEffect(() => {
    if (still) return;
    let t: ReturnType<typeof setTimeout>;
    if (shown.line >= total) {
      if (auto) t = setTimeout(() => go((tab + 1) % TABS.length, true), TAB_HOLD);
      return () => clearTimeout(t);
    }
    const full = lines[shown.line].t.length;
    t = setTimeout(
      () => {
        if (!visible.current) return setShown({ ...shown });
        setShown(shown.ch >= full ? { line: shown.line + 1, ch: 0 } : { line: shown.line, ch: Math.min(full, shown.ch + 2) });
      },
      shown.ch >= full ? LINE_PAUSE : CHAR_MS,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, tab, auto, still]);

  function go(i: number, keepAuto = false) {
    setTab(i);
    setShown({ line: 0, ch: 0 });
    if (!keepAuto) setAuto(false);
  }

  const progress = still ? 1 : Math.min(1, (shown.line + (lines[shown.line] ? shown.ch / lines[shown.line].t.length : 0)) / total);

  return (
    <div className="term" ref={box}>
      <div className="term-tabs mono" role="tablist" aria-label="Podgląd procesu">
        {TABS.map((tb, i) => (
          <button key={tb.id} role="tab" aria-selected={i === tab} className={i === tab ? "on" : ""} onClick={() => go(i)}>
            <span className="sq" aria-hidden />
            {tb.label}
            {i === tab && <span className="bar" style={{ transform: `scaleX(${progress})` }} aria-hidden />}
          </button>
        ))}
      </div>
      <div className="term-win">
        <div className="term-head code">
          <span className="dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span className="dim">{TABS[tab].title}</span>
          <span className={`term-state mono ${done ? "ok" : ""}`}>{done ? "■ gotowe" : "● na żywo"}</span>
        </div>
        <div className="term-body code" role="tabpanel" aria-live="off">
          {lines.map((l, i) => {
            if (!still && i > shown.line) return null;
            const txt = still || i < shown.line ? l.t : l.t.slice(0, shown.ch);
            return (
              <div key={i} className={`tl ${l.tone ?? ""}`}>
                <span className="tag">{l.tag === "$" ? "$" : `[${l.tag}]`}</span>
                <span className="tx">
                  {txt}
                  {!still && i === shown.line && <span className="caret" />}
                </span>
              </div>
            );
          })}
          {done && (
            <div className="tl">
              <span className="tag">$</span>
              <span className="tx">
                <span className="caret" />
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
