"use client";
import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    n: "01",
    title: "Wysyłasz zlecenie",
    text: "Plik, pomysł albo model policzony w kalkulatorze. Best fit dobiera drukarzy, którzy pasują najlepiej.",
    tone: "var(--accent)",
    wires: ["ca"],
    nodes: ["client", "a"],
    path: "ca",
  },
  {
    n: "02",
    title: "Drukarze składają oferty",
    text: "Cena i termin od każdego. Wybierasz jedną i śledzisz status: przyjęte → w druku → wysłane.",
    tone: "var(--go)",
    wires: ["ca", "aacc"],
    nodes: ["a", "acc"],
    path: "aacc",
  },
  {
    n: "03",
    title: "…albo prosi o pomoc",
    text: "Za duża seria albo brak materiału? Jednym kliknięciem tworzy drugie zapytanie do innego drukarza — drukują razem.",
    tone: "var(--help)",
    wires: ["ca", "ahelp", "helpacc"],
    nodes: ["a", "help", "acc"],
    path: "ahelp",
  },
  {
    n: "04",
    title: "…albo odrzuca",
    text: "Przy zapytaniu wysłanym bezpośrednio do drukarza — z powodem. Jednym kliknięciem przekierujesz je dalej.",
    tone: "var(--stop)",
    wires: ["ca", "arej", "rejc"],
    nodes: ["a", "rej", "client"],
    path: "arej",
  },
];

const WIRES: Record<string, string> = {
  ca: "M180,228 H250",
  aacc: "M390,228 C430,228 430,88 470,88",
  ahelp: "M390,228 H470",
  arej: "M390,228 C430,228 430,368 470,368",
  helpacc: "M540,200 V116",
  rejc: "M540,396 C540,456 110,456 110,256",
};

const NODES: { id: string; x: number; y: number; k: string; t: string }[] = [
  { id: "client", x: 40, y: 200, k: "ZAMAWIAJĄCY", t: "Jan · WR-1042" },
  { id: "a", x: 250, y: 200, k: "BEST FIT 94%", t: "Kraków · X1C" },
  { id: "acc", x: 470, y: 60, k: "OFERTA", t: "540 zł · 5 dni" },
  { id: "help", x: 470, y: 200, k: "PROSI O POMOC", t: "Drukarz B · 20 szt." },
  { id: "rej", x: 470, y: 340, k: "ODRZUCA", t: "→ kolejny drukarz" },
];

export default function FlowDiagram() {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.3 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!auto || !inView) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % STEPS.length), 4200);
    return () => clearTimeout(t);
  }, [active, auto, inView]);

  const s = STEPS[active];

  return (
    <div className="flow" ref={ref} style={{ ["--tone" as string]: s.tone }}>
      <div className="flow-tabs" role="tablist" aria-label="Etapy zlecenia">
        {STEPS.map((st, i) => (
          <button
            key={st.n}
            role="tab"
            className="flow-tab"
            aria-selected={i === active}
            style={{ ["--tone" as string]: st.tone }}
            onClick={() => {
              setActive(i);
              setAuto(false);
            }}
          >
            <span className="n mono">{st.n}</span>
            <span>
              <h3>{st.title}</h3>
              <p>{st.text}</p>
            </span>
          </button>
        ))}
      </div>
      <div className="flow-stage grid-bg" role="tabpanel" aria-live="polite">
        <svg viewBox="0 0 640 480" preserveAspectRatio="xMidYMid meet" aria-hidden>
          {Object.entries(WIRES).map(([id, d]) => (
            <path key={id} d={d} className="wire" id={`w-${id}`} />
          ))}
          {Object.entries(WIRES).map(([id, d]) => (
            <path
              key={`l-${id}`}
              d={d}
              className={`wire-live${s.wires.includes(id) ? " on" : ""}`}
              stroke={s.tone}
            />
          ))}
          {NODES.map((n) => {
            const on = s.nodes.includes(n.id);
            return (
              <g key={n.id} className={`node${on ? " on" : ""}`} style={{ ["--tone" as string]: s.tone }}>
                <rect x={n.x} y={n.y} width={140} height={56} rx={4} />
                <text x={n.x + 14} y={n.y + 22}>{n.k}</text>
                <text x={n.x + 14} y={n.y + 42} className="t">{n.t}</text>
              </g>
            );
          })}
          <circle key={`p-${active}`} r={4} className="packet" style={{ fill: s.tone }}>
            <animateMotion dur="1.4s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1">
              <mpath href={`#w-${s.path}`} />
            </animateMotion>
          </circle>
        </svg>
        <div className="mono dim" style={{ position: "absolute", left: 16, bottom: 14 }}>
          Etap {s.n} / 04
        </div>
        <div className="mono dim" style={{ position: "absolute", right: 16, bottom: 14 }}>
          {auto ? "Auto" : "Ręcznie"}
        </div>
      </div>
    </div>
  );
}
