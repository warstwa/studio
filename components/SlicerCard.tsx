import { duration } from "@/lib/format";
import type { SlicerSummary } from "@/lib/types";

const g = (v: number) => `${v.toLocaleString("pl-PL", { maximumFractionDigits: v < 10 ? 1 : 0 })} g`;
const SUP: Record<string, string> = { none: "bez podpór", normal: "podpory zwykłe", tree: "podpory drzewiaste" };

/** Podsumowanie z kalkulatora dołączone do zamówienia. */
export default function SlicerCard({ s }: { s: SlicerSummary }) {
  return (
    <div className="panel slicer-card">
      <div className="panel-head">
        <span className="mono">Z kalkulatora · {s.modelName}</span>
        <span className="mono dim">szacunek ±25%</span>
      </div>
      <div className="panel-body">
        <div className="stat-strip">
          <div><span className="mono dim">Czas druku</span><b>{duration(s.seconds)}</b></div>
          <div><span className="mono dim">Filament</span><b>{g(s.grams)}</b></div>
          <div><span className="mono dim">Stoły</span><b>{s.plates}</b></div>
          <div><span className="mono dim">{s.filaments.length > 1 ? "Zmiany koloru" : "Ilość"}</span><b>{s.filaments.length > 1 ? s.changes : `${s.quantity} szt.`}</b></div>
        </div>
        <div className="slicer-meta">
          <div className="chips">
            {s.filaments.map((f, i) => (
              <span key={i} className="chip chip-color"><i style={{ background: f.color }} />{f.label} · {f.material}{f.grams ? ` · ${g(f.grams)}` : ""}</span>
            ))}
          </div>
          <span className="dim">
            warstwa {s.layerHeight} mm · wypełnienie {s.infill}% · {s.walls} obrysy · {SUP[s.supports] ?? s.supports}
            {s.size ? ` · ${s.size.map((v) => Math.round(v)).join(" × ")} mm` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
