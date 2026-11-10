"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  DEFAULT_SETTINGS,
  MATERIALS,
  MULTI_MODES,
  PROFILES,
  colorStats,
  estimate,
  formatDuration,
  rotate90,
  type ColorStats,
  type Estimate,
  type MaterialId,
  type MultiMode,
  type PrintSettings,
  type SpeedProfile,
  type SupportType,
} from "@/lib/slicer/estimate";
import { ACCEPT, loadModel, mergeModels, type Model } from "@/lib/slicer/load";

const Viewer = dynamic(() => import("./Viewer"), { ssr: false, loading: () => <div className="viewer" /> });

const UNITS = { mm: 1, cm: 10, m: 1000, in: 25.4 } as const;
type Unit = keyof typeof UNITS;
type Turn = "x+" | "x-" | "y+" | "y-";

const fmt = (v: number, d = 0) => v.toLocaleString("pl-PL", { minimumFractionDigits: d, maximumFractionDigits: d });
const grams = (v: number) => `${fmt(v, v < 10 ? 1 : 0)} g`;

/** Kolor sRGB (#rrggbb) → liniowy RGB dla WebGL. */
function linear(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
}

type Result = { est: Estimate; colors: ColorStats | null };

export default function SlicerTool() {
  const [model, setModel] = useState<Model | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [unit, setUnit] = useState<Unit>("mm");
  const [settings, setSettings] = useState<PrintSettings>(DEFAULT_SETTINGS);
  const [mode, setMode] = useState<MultiMode>("ams");
  const [waste, setWaste] = useState<number>(MULTI_MODES.ams.waste);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [showOverhangs, setShowOverhangs] = useState(true);
  const input = useRef<HTMLInputElement>(null);
  const appendNext = useRef(false);

  const set = <K extends keyof PrintSettings>(k: K, v: PrintSettings[K]) => setSettings((s) => ({ ...s, [k]: v }));

  // Skala jednostek + obroty użytkownika.
  const positions = useMemo(() => {
    if (!model) return null;
    let p = model.positions;
    const k = UNITS[unit];
    if (k !== 1) p = p.map((v) => v * k);
    for (const t of turns) p = rotate90(p, t[0] as "x" | "y", t[1] === "+" ? 1 : -1);
    return p;
  }, [model, unit, turns]);

  // Grupy o tym samym kolorze to ten sam filament.
  const filaments = useMemo(() => {
    const list = Array.from(new Set(colors.map((c) => c.toLowerCase())));
    return { list, ofGroup: colors.map((c) => list.indexOf(c.toLowerCase())) };
  }, [colors]);

  const triColors = useMemo(() => {
    if (!model || colors.length < 2) return null;
    const lin = colors.map(linear);
    const out = new Float32Array(model.group.length * 3);
    for (let t = 0; t < model.group.length; t++) {
      const c = lin[model.group[t]] ?? lin[0];
      out[t * 3] = c[0];
      out[t * 3 + 1] = c[1];
      out[t * 3 + 2] = c[2];
    }
    return out;
  }, [model, colors]);

  useEffect(() => {
    if (!positions || !model) return setResult(null);
    const id = setTimeout(() => {
      try {
        const est = estimate(positions, settings);
        let cs: ColorStats | null = null;
        if (filaments.list.length > 1) {
          const tri = new Uint8Array(model.group.length);
          for (let t = 0; t < tri.length; t++) tri[t] = filaments.ofGroup[model.group[t]] ?? 0;
          cs = colorStats(positions, tri, model.object, model.objectBase.map((g) => filaments.ofGroup[g] ?? 0), filaments.list.length, est, settings, mode, waste);
        }
        setResult({ est, colors: cs });
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Nie udało się przeanalizować modelu.");
      }
    }, 60);
    return () => clearTimeout(id);
  }, [positions, model, settings, filaments, mode, waste]);

  const open = useCallback(async (list: FileList | File[] | undefined | null, append: boolean) => {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    setError(null);
    setLoading(files.some((f) => /\.(step|stp)$/i.test(f.name)) ? "Wczytywanie STEP (pierwszy raz pobiera moduł CAD)…" : "Wczytywanie modelu…");
    try {
      let m: Model | null = null;
      for (const f of files) {
        const part = await loadModel(f);
        m = m ? mergeModels(m, part) : part;
      }
      setModel((prev) => {
        const next = append && prev ? mergeModels(prev, m!) : m!;
        // przy dodawaniu części zachowaj kolory wybrane wcześniej
        setColors((old) => (append && prev ? [...old.slice(0, prev.groups.length), ...next.groups.slice(prev.groups.length).map((g) => g.color)] : next.groups.map((g) => g.color)));
        return next;
      });
      if (!append) {
        setTurns([]);
        setUnit("mm");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się wczytać pliku.");
    } finally {
      setLoading(null);
    }
  }, []);

  const pick = (append: boolean) => {
    appendNext.current = append;
    input.current?.click();
  };

  const q = settings.quantity;
  const est = result?.est;
  const cs = result?.colors;
  const seconds = est ? est.seconds + (cs?.extraSeconds ?? 0) : 0;
  const totalGrams = est ? est.modelGrams + est.supportGrams + (cs?.wasteGrams ?? 0) : 0;
  const filamentArea = Math.PI * (settings.filamentDiameter / 2) ** 2;
  const totalMeters = est ? est.meters + ((cs?.wasteGrams ?? 0) / MATERIALS[settings.material].density) * 1000 / filamentArea / 1000 : 0;

  return (
    <div className="two-col slicer">
      <div className="stack">
        <div
          className={`panel dropzone${drag ? " drag" : ""}${model ? " has-file" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            open(e.dataTransfer.files, false);
          }}
        >
          <input ref={input} type="file" accept={ACCEPT} multiple hidden onChange={(e) => { open(e.target.files, appendNext.current); e.target.value = ""; }} />
          <div className="panel-head">
            <span className="mono ellipsis">{model ? model.name : "01 · Model"}</span>
            {model && (
              <div className="row-tight">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => pick(true)}>
                  + Dodaj część
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => pick(false)}>
                  Zmień plik
                </button>
              </div>
            )}
          </div>
          {positions ? (
            <div className="viewer-wrap">
              <Viewer positions={positions} overhang={est?.overhang ?? null} showOverhangs={showOverhangs} colors={triColors} />
              <div className="viewer-tools">
                <div className="tool-group" role="group" aria-label="Obrót modelu">
                  <span className="mono dim">Obróć</span>
                  {(["x+", "x-", "y+", "y-"] as Turn[]).map((t) => (
                    <button key={t} type="button" className="btn btn-sm" onClick={() => setTurns((v) => [...v, t])} title={`90° wokół osi ${t[0].toUpperCase()}`}>
                      {t[0].toUpperCase()} {t[1] === "+" ? "↻" : "↺"}
                    </button>
                  ))}
                  {turns.length > 0 && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTurns([])}>
                      Reset
                    </button>
                  )}
                </div>
                <label className="check">
                  <input type="checkbox" checked={showOverhangs} onChange={(e) => setShowOverhangs(e.target.checked)} />
                  <span>
                    Pokaż nawisy <i className="swatch" />
                  </span>
                </label>
              </div>
            </div>
          ) : (
            <button type="button" className="drop-cta" onClick={() => pick(false)} disabled={!!loading}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
                <path d="M20 26V8M13 15l7-7 7 7" />
                <path d="M6 26v6h28v-6" />
              </svg>
              <b>Przeciągnij plik tutaj lub kliknij, aby wybrać</b>
              <span className="mono dim">STL · 3MF · STEP — plik nie opuszcza Twojej przeglądarki</span>
              <span className="mono dim">Wielokolorowy: 3MF z kolorami albo kilka plików naraz (jeden plik = jeden kolor)</span>
            </button>
          )}
          {loading && (
            <div className="viewer-status mono">
              <span className="spinner" /> {loading}
            </div>
          )}
        </div>

        {error && <div className="alert" role="alert">{error}</div>}

        {model && (
          <div className="panel">
            <div className="panel-head">
              <span className="mono">03 · Kolory</span>
              <span className="mono dim">{filaments.list.length > 1 ? `${filaments.list.length} filamenty` : "jednokolorowy"}</span>
            </div>
            <div className="panel-body stack-sm">
              <ul className="color-list">
                {model.groups.map((g, i) => (
                  <li key={i}>
                    <input type="color" className="color-input" value={colors[i] ?? "#cccccc"} aria-label={`Kolor: ${g.label}`}
                      onChange={(e) => setColors((c) => c.map((x, j) => (j === i ? e.target.value : x)))} />
                    <span className="ellipsis">{g.label}</span>
                    <span className="mono dim">{cs ? grams(cs.grams[filaments.ofGroup[i]] * q) : est ? grams((est.modelGrams + est.supportGrams) * q) : ""}</span>
                  </li>
                ))}
              </ul>
              {model.groups.length > 1 && <p className="hint">Części w tym samym kolorze liczą się jako jeden filament.</p>}
              {filaments.list.length < 2 && (
                <div className="multi-empty">
                  <p>
                    Druk wielokolorowy: dodaj części w innych kolorach (osobne pliki STL/STEP) albo wgraj 3MF z kolorami z Bambu Studio, OrcaSlicera lub PrusaSlicera.
                  </p>
                  <button type="button" className="btn btn-sm" onClick={() => pick(true)}>
                    + Dodaj część w innym kolorze
                  </button>
                </div>
              )}
              {filaments.list.length > 1 && (
                <>
                  <div className="field">
                    <span className="label">Zmiana koloru</span>
                    <div className="seg three">
                      {(Object.keys(MULTI_MODES) as MultiMode[]).map((m) => (
                        <label key={m} title={MULTI_MODES[m].hint}>
                          <input type="radio" name="multimode" checked={mode === m} onChange={() => { setMode(m); setWaste(MULTI_MODES[m].waste); }} />
                          <b>{MULTI_MODES[m].name}</b>
                          <span>{MULTI_MODES[m].hint}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {mode !== "manual" && (
                    <div className="field inline-field">
                      <label htmlFor="waste">Odpad na zmianę (g)</label>
                      <input id="waste" className="input" type="number" min={0} max={5} step={0.05} value={waste}
                        onChange={(e) => setWaste(Math.max(0, Math.min(5, +e.target.value || 0)))} />
                    </div>
                  )}
                  {cs && (
                    <div className="spec">
                      <div className="spec-row"><span>{mode === "manual" ? "Ręczne zmiany filamentu" : "Zmiany koloru"}</span><span>{fmt(cs.changes * (mode === "manual" ? 1 : q))}</span></div>
                      {mode !== "manual" && <div className="spec-row"><span>Odpad (płukanie + wieża)</span><span>{grams(cs.wasteGrams * q)}</span></div>}
                      {mode !== "manual" && <div className="spec-row"><span>Dodatkowy czas</span><span>{formatDuration(cs.extraSeconds * q)}</span></div>}
                      {mode !== "manual" && <div className="spec-row"><span>Warstwy ze zmianą</span><span>{fmt(cs.layersWithChanges)} z {fmt(est!.layers)}</span></div>}
                    </div>
                  )}
                  {cs && mode === "manual" && cs.mixedLayers > 0 && (
                    <div className="alert warn">
                      {fmt(cs.mixedLayers)} warstw ma więcej niż jeden kolor — ręczna zmiana na wysokości tego nie wydrukuje. Potrzebny AMS/MMU albo zmieniacz narzędzi.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {est && (
          <>
            <div className="kpis slicer-kpis">
              <div className="kpi">
                <span className="mono dim">Czas druku{q > 1 ? ` · ${q} szt.` : ""}</span>
                <b>{formatDuration(seconds * q)}</b>
                <span className="mono dim">
                  {q > 1 ? `${formatDuration(seconds)} / szt.` : cs && cs.extraSeconds > 0 ? `w tym zmiany koloru ${formatDuration(cs.extraSeconds)}` : " "}
                </span>
              </div>
              <div className="kpi">
                <span className="mono dim">Filament{q > 1 ? ` · ${q} szt.` : ""}</span>
                <b>{grams(totalGrams * q)}</b>
                <span className="mono dim">{fmt(totalMeters * q, 2)} m · {MATERIALS[settings.material].name}{cs ? ` · ${filaments.list.length} kolory` : ""}</span>
              </div>
              <div className="kpi">
                <span className="mono dim">{cs && cs.wasteGrams > 0 ? "Podpory / odpad" : "W tym podpory"}</span>
                <b>
                  {settings.supports === "none" ? "—" : grams(est.supportGrams * q)}
                  {cs && cs.wasteGrams > 0 && <> / {grams(cs.wasteGrams * q)}</>}
                </b>
                <span className="mono dim">
                  {settings.supports === "none"
                    ? est.overhang.some(Boolean) ? "podpory wyłączone · model ma nawisy" : "podpory wyłączone"
                    : est.supportGrams > 0 ? `${fmt(est.overhangArea / 100, 1)} cm² nawisów` : "podpory niepotrzebne"}
                </span>
              </div>
            </div>

            <div className="specs">
              <div><span className="mono dim">Wymiary</span><div className="v">{est.size.map((v) => fmt(v, 1)).join(" × ")} mm</div></div>
              <div><span className="mono dim">Objętość bryły</span><div className="v">{fmt(est.volume / 1000, 1)} cm³</div></div>
              <div><span className="mono dim">Model / podpory</span><div className="v">{fmt(est.modelGrams, 1)} g / {fmt(est.supportGrams, 1)} g</div></div>
              <div><span className="mono dim">Warstwy</span><div className="v">{fmt(est.layers)} × {settings.layerHeight} mm</div></div>
              <div><span className="mono dim">Obrysy</span><div className="v">{fmt(est.shell / 1000, 1)} cm³</div></div>
              <div><span className="mono dim">Wypełnienie</span><div className="v">{fmt(est.infill / 1000, 1)} cm³</div></div>
              <div><span className="mono dim">Podpory</span><div className="v">{fmt(est.support / 1000, 1)} cm³</div></div>
              <div><span className="mono dim">Trójkąty</span><div className="v">{fmt(est.triangles)}</div></div>
            </div>

            {est.warnings.map((w) => (
              <div key={w} className="alert warn">{w}</div>
            ))}
            <p className="mono dim slicer-note">
              Szacunek bez slicowania — zwykle ±20–30% względem PrusaSlicera/OrcaSlicera{cs ? "; odpad przy zmianie koloru zależy też od pary kolorów" : ""}. Dokładną wycenę poda drukarz.
            </p>
          </>
        )}
      </div>

      <aside className="panel sticky">
        <div className="panel-head"><span className="mono">02 · Ustawienia druku</span></div>
        <div className="panel-body form">
          <div className="form-grid">
            <div className="field">
              <label htmlFor="material">Materiał</label>
              <select className="select" id="material" value={settings.material} onChange={(e) => set("material", e.target.value as MaterialId)}>
                {Object.entries(MATERIALS).map(([id, m]) => <option key={id} value={id}>{m.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="quantity">Ilość (szt.)</label>
              <input className="input" id="quantity" type="number" min={1} max={1000} value={q}
                onChange={(e) => set("quantity", Math.max(1, Math.min(1000, Math.round(+e.target.value) || 1)))} />
            </div>
            <div className="field">
              <label htmlFor="layerHeight">Warstwa (mm)</label>
              <select className="select" id="layerHeight" value={settings.layerHeight} onChange={(e) => set("layerHeight", +e.target.value)}>
                {[0.08, 0.12, 0.16, 0.2, 0.24, 0.28].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="walls">Obrysy</label>
              <select className="select" id="walls" value={settings.walls} onChange={(e) => set("walls", +e.target.value)}>
                {[1, 2, 3, 4, 5, 6].map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="infill">Wypełnienie: {settings.infill}%</label>
            <input id="infill" className="range" type="range" min={0} max={100} step={5} value={settings.infill} onChange={(e) => set("infill", +e.target.value)} />
          </div>

          <div className="field">
            <span className="label">Drukarka</span>
            <div className="seg">
              {(Object.keys(PROFILES) as SpeedProfile[]).map((p) => (
                <label key={p}>
                  <input type="radio" name="profile" checked={settings.profile === p} onChange={() => set("profile", p)} />
                  <b>{PROFILES[p].name}</b>
                  <span>{PROFILES[p].hint}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="label">Podpory</span>
            <div className="seg three">
              {([["none", "Brak"], ["normal", "Zwykłe"], ["tree", "Drzewiaste"]] as [SupportType, string][]).map(([v, l]) => (
                <label key={v}>
                  <input type="radio" name="supports" checked={settings.supports === v} onChange={() => set("supports", v)} />
                  <b>{l}</b>
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="supportAngle">Próg nawisu: {settings.supportAngle}°</label>
            <input id="supportAngle" className="range" type="range" min={20} max={70} step={5} value={settings.supportAngle} onChange={(e) => set("supportAngle", +e.target.value)} />
            <span className="hint">Powierzchnie nachylone mniej niż {settings.supportAngle}° od poziomu dostaną podpory.</span>
          </div>

          {model && (
            <div className="field">
              <label htmlFor="unit">Jednostki pliku</label>
              <select className="select" id="unit" value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
                <option value="mm">milimetry</option>
                <option value="cm">centymetry</option>
                <option value="m">metry</option>
                <option value="in">cale</option>
              </select>
            </div>
          )}

          <Link href="/zapytania/nowe" className="btn btn-primary btn-lg">
            Zamów wydruk u drukarza
          </Link>
        </div>
      </aside>
    </div>
  );
}
