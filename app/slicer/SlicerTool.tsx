"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { slicerOrderAction } from "@/app/actions";
import { uploadFiles } from "@/lib/upload-client";
import { stashOrder, takeStash } from "@/lib/order-stash";
import type { SlicerSummary } from "@/lib/types";
import {
  DEFAULT_SETTINGS,
  MATERIALS,
  MULTI_MODES,
  PROFILES,
  formatDuration,
  rotate90,
  type MaterialId,
  type MultiMode,
  type PrintSettings,
  type SpeedProfile,
  type SupportType,
} from "@/lib/slicer/estimate";
import { ACCEPT, PALETTE, loadModel, mergeModels, type Model } from "@/lib/slicer/load";
import { BEDS, itemTriangles } from "@/lib/slicer/arrange";
import { canSplitByColor, checkFileLayout, evaluate, layout, type Filament, type Plan, type PlanInput, type PlacementMode, type PlateMode } from "@/lib/slicer/plan";
import type { BedRect } from "./Viewer";

const Viewer = dynamic(() => import("./Viewer"), { ssr: false, loading: () => <div className="viewer" /> });

const UNITS = { mm: 1, cm: 10, m: 1000, in: 25.4 } as const;
type Unit = keyof typeof UNITS;
type Turn = "x+" | "x-" | "y+" | "y-";
const PLATE_GAP = 40; // odstęp między stołami w podglądzie (mm)

const fmt = (v: number, d = 0) => v.toLocaleString("pl-PL", { minimumFractionDigits: d, maximumFractionDigits: d });
const grams = (v: number) => `${fmt(v, v < 10 ? 1 : 0)} g`;
/** Polska odmiana: 1 stół, 2–4 stoły, 5+ stołów. */
const plural = (n: number, one: string, few: string, many: string) =>
  n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many;
const plates = (n: number) => `${n} ${plural(n, "stół", "stoły", "stołów")}`;

/** Kolor sRGB (#rrggbb) → liniowy RGB dla WebGL. */
function linear(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
}

type Results = { plan: Plan; other: Plan | null };

/** Materiał z kalkulatora → nazwa w zamówieniach. */
const ORDER_MATERIAL: Record<string, string> = { PLA: "PLA", PETG: "PETG", ABS: "ABS", ASA: "ASA", TPU: "TPU 95A", PA: "PA", PC: "PC" };

type Account = { id: string } | null;

export default function SlicerTool({
  account = null,
  blob = false,
  resume = false,
  remote,
}: {
  account?: Account;
  blob?: boolean;
  resume?: boolean;
  remote?: { url: string; name: string };
}) {
  const router = useRouter();
  const sourceFiles = useRef<File[]>([]);
  const [ordering, setOrdering] = useState<string | null>(null);
  const [model, setModel] = useState<Model | null>(null);
  const [filaments, setFilaments] = useState<Filament[]>([]);
  const [groupFilament, setGroupFilament] = useState<number[]>([]);
  const [itemOverride, setItemOverride] = useState<(number | null)[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [unit, setUnit] = useState<Unit>("mm");
  const [settings, setSettings] = useState<PrintSettings>(DEFAULT_SETTINGS);
  const [mode, setMode] = useState<MultiMode>("ams");
  const [waste, setWaste] = useState<number>(MULTI_MODES.ams.waste);
  const [bedId, setBedId] = useState(BEDS[0].id);
  const [placement, setPlacement] = useState<PlacementMode>("file");
  const [plateMode, setPlateMode] = useState<PlateMode>("single");
  const [gap, setGap] = useState(6);
  const [results, setResults] = useState<Results | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [showOverhangs, setShowOverhangs] = useState(true);
  const input = useRef<HTMLInputElement>(null);
  const appendNext = useRef(false);

  const bed = BEDS.find((b) => b.id === bedId) ?? BEDS[0];
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

  const itemTris = useMemo(() => (model ? itemTriangles(model.item, model.items.length) : []), [model]);

  // Grupy kolorów z pliku obecne w każdej części.
  const itemGroups = useMemo(() => {
    if (!model) return [];
    const sets = model.items.map(() => new Set<number>());
    for (let t = 0; t < model.item.length; t++) sets[model.item[t]].add(model.group[t]);
    return sets.map((s) => Array.from(s));
  }, [model]);

  const planInput = useMemo<PlanInput | null>(() => {
    if (!model || !positions || !filaments.length) return null;
    const fil = (g: number) => Math.min(filaments.length - 1, groupFilament[g] ?? 0);
    const triFilament = new Uint8Array(model.group.length);
    for (let t = 0; t < triFilament.length; t++) triFilament[t] = itemOverride[model.item[t]] ?? fil(model.group[t]);
    const objItem = new Array<number>(model.objectBase.length).fill(-1);
    for (let t = 0; t < model.object.length; t++) if (objItem[model.object[t]] < 0) objItem[model.object[t]] = model.item[t];
    const objectFilament = model.objectBase.map((g, o) => itemOverride[objItem[o]] ?? fil(g));
    const itemFilament = model.items.map((_, i) => {
      if (itemOverride[i] != null) return itemOverride[i];
      const fs = new Set(itemGroups[i].map(fil));
      return fs.size === 1 ? [...fs][0] : null;
    });
    return { positions, itemTris, itemNames: model.items.map((i) => i.name), object: model.object, triFilament, objectFilament, itemFilament, filaments };
  }, [model, positions, filaments, groupFilament, itemOverride, itemTris, itemGroups]);

  const splittable = planInput ? canSplitByColor(planInput) : false;
  const effPlateMode: PlateMode = splittable ? plateMode : "single";
  const effPlacement: PlacementMode = effPlateMode === "perColor" ? "auto" : placement;

  // Układ zależy tylko od geometrii, stołu i przypisań części – nie od ustawień druku.
  const lay = useMemo(() => (planInput ? layout(planInput, bed, effPlacement, effPlateMode, gap) : null), [planInput, bed, effPlacement, effPlateMode, gap]);
  const otherLay = useMemo(() => {
    if (!planInput || !splittable) return null;
    return effPlateMode === "perColor" ? layout(planInput, bed, placement, "single", gap) : layout(planInput, bed, "auto", "perColor", gap);
  }, [planInput, splittable, effPlateMode, bed, placement, gap]);
  const fileCheck = useMemo(() => (planInput && effPlacement === "file" ? checkFileLayout(planInput, bed) : null), [planInput, effPlacement, bed]);

  useEffect(() => {
    if (!planInput || !lay) return setResults(null);
    setBusy(true);
    const id = setTimeout(() => {
      try {
        const s = { ...settings, material: filaments[0]?.material ?? settings.material };
        const plan = evaluate(planInput, lay.plates, lay.oversize, bed, s, mode, waste);
        const other = otherLay ? evaluate(planInput, otherLay.plates, otherLay.oversize, bed, s, mode, waste) : null;
        setResults({ plan, other });
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Nie udało się przeanalizować modelu.");
      } finally {
        setBusy(false);
      }
    }, 60);
    return () => clearTimeout(id);
  }, [planInput, lay, otherLay, settings, mode, waste, bed, filaments]);

  // Dane do podglądu: stoły obok siebie.
  const view = useMemo(() => {
    const plan = results?.plan;
    if (!plan || !plan.plates.length) return null;
    const n = plan.plates.reduce((a, p) => a + p.positions.length, 0);
    const pos = new Float32Array(n);
    const col = new Float32Array(n / 3);
    const ov = new Uint8Array(n / 9);
    const lin = filaments.map((f) => linear(f.color));
    const beds: BedRect[] = [];
    let o = 0, t = 0;
    plan.plates.forEach((p, i) => {
      const ox = i * (bed.w + PLATE_GAP);
      beds.push({ x: ox, y: 0, w: bed.w, d: bed.d, label: p.label });
      for (let k = 0; k < p.positions.length; k += 3) {
        pos[o + k] = p.positions[k] + ox;
        pos[o + k + 1] = p.positions[k + 1];
        pos[o + k + 2] = p.positions[k + 2];
      }
      o += p.positions.length;
      for (let q = 0; q < p.triFilament.length; q++, t++) {
        const c = lin[p.triFilament[q]] ?? lin[0];
        col[t * 3] = c[0];
        col[t * 3 + 1] = c[1];
        col[t * 3 + 2] = c[2];
        ov[t] = p.est.overhang[q];
      }
    });
    return { pos, col, ov, beds };
  }, [results, filaments, bed]);

  const open = useCallback(async (list: FileList | File[] | undefined | null, append: boolean) => {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    setError(null);
    setLoading(files.some((f) => /\.(step|stp)$/i.test(f.name)) ? "Wczytywanie STEP (pierwszy raz pobiera moduł CAD)…" : "Wczytywanie modelu…");
    try {
      sourceFiles.current = append ? [...sourceFiles.current, ...files] : files;
      let m: Model | null = null;
      for (const f of files) {
        const part = await loadModel(f);
        m = m ? mergeModels(m, part) : part;
      }
      const fromGroups = (gs: Model["groups"], offset: number) =>
        gs.map((g, i) => ({ label: g.label, color: g.color || PALETTE[(offset + i) % PALETTE.length], material: "PLA" as MaterialId }));
      setModel((prev) => {
        const keep = append && prev;
        const next = keep ? mergeModels(prev, m!) : m!;
        const pg = keep ? prev.groups.length : 0;
        const pi = keep ? prev.items.length : 0;
        setFilaments((old) => {
          const base = keep ? old : [];
          // nowe grupy dostają nowe filamenty
          const added = fromGroups(next.groups.slice(pg), base.length);
          setGroupFilament((gf) => [...(keep ? gf.slice(0, pg) : []), ...added.map((_, i) => base.length + i)]);
          return [...base, ...added];
        });
        setItemOverride((ov) => [...(keep ? ov.slice(0, pi) : []), ...next.items.slice(pi).map(() => null)]);
        return next;
      });
      if (!append) {
        setTurns([]);
        setUnit("mm");
        setPlacement("file");
        setPlateMode("single");
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
  const setFilament = (i: number, patch: Partial<Filament>) => setFilaments((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const addFilament = () =>
    setFilaments((fs) => [...fs, { label: `Filament ${fs.length + 1}`, color: PALETTE[fs.length % PALETTE.length], material: fs[fs.length - 1]?.material ?? "PLA" }]);

  const plan = results?.plan;
  const other = results?.other;
  const q = settings.quantity;
  const usedFilaments = plan ? plan.grams.map((g, i) => (g > 0.0001 ? i : -1)).filter((i) => i >= 0) : [];
  const multi = usedFilaments.length > 1;
  const one = plan && plan.plates.length === 1 ? plan.plates[0] : null;
  const supportGrams = plan ? plan.plates.reduce((a, p) => a + (p.est.support / 1000) * MATERIALS[filaments[p.cs.main]?.material ?? "PLA"].density, 0) : 0;
  const totalGrams = plan ? plan.grams.reduce((a, g) => a + g, 0) + plan.wasteGrams : 0;
  const extraSeconds = plan ? plan.plates.reduce((a, p) => a + p.cs.extraSeconds, 0) : 0;
  const names = model?.items.map((i) => i.name) ?? [];
  const singleTotal = other && effPlateMode === "perColor" ? other : plan;
  const perColorTotal = other && effPlateMode === "perColor" ? plan : other;

  // ── „Dodaj do zamówienia” ──
  const summary = (): SlicerSummary | null => {
    if (!plan || !model) return null;
    return {
      modelName: model.name,
      seconds: plan.seconds * q,
      grams: totalGrams * q,
      meters: plan.meters * q,
      plates: plan.plates.length,
      changes: plan.changes * q,
      quantity: q,
      layerHeight: settings.layerHeight,
      infill: settings.infill,
      walls: settings.walls,
      supports: settings.supports,
      profile: settings.profile,
      size: one ? (one.est.size.map((v) => Math.round(v * 10) / 10) as [number, number, number]) : undefined,
      filaments: (usedFilaments.length ? usedFilaments : [0]).map((i) => ({
        label: filaments[i]?.label ?? `Filament ${i + 1}`,
        color: filaments[i]?.color ?? "#888888",
        material: ORDER_MATERIAL[filaments[i]?.material ?? "PLA"] ?? "PLA",
        grams: (plan.grams[i] ?? 0) * q,
      })),
    };
  };

  async function submitOrder(s: SlicerSummary, files: File[]) {
    if (!account) return;
    try {
      setOrdering(files.length ? "Wysyłanie plików modelu…" : "Tworzenie zamówienia…");
      const attached = files.length ? await uploadFiles(files, { blob, userId: account.id, onProgress: (_, p) => setOrdering(`Wysyłanie plików modelu… ${p}%`) }) : [];
      setOrdering("Tworzenie zamówienia…");
      const res = await slicerOrderAction({ slicer: s, files: attached });
      if (res.error || !res.id) throw new Error(res.error || "Nie udało się utworzyć zamówienia.");
      router.push(`/zamow/${res.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się utworzyć zamówienia.");
      setOrdering(null);
    }
  }

  async function addToOrder() {
    const s = summary();
    if (!s) return;
    if (!account) {
      // zapamiętaj pracę i wróć tu po zalogowaniu
      try {
        await stashOrder(s, sourceFiles.current);
      } catch {}
      router.push(`/logowanie?next=${encodeURIComponent("/slicer?wznow=1")}`);
      return;
    }
    await submitOrder(s, sourceFiles.current);
  }

  // powrót po logowaniu: dokończ „Dodaj do zamówienia”
  const resumed = useRef(false);
  useEffect(() => {
    if (!resume || !account || resumed.current) return;
    resumed.current = true;
    takeStash().then((st) => {
      if (st) submitOrder(st.slicer, st.files);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume, account]);

  // model ze zlecenia: /slicer?plik=…
  const loadedRemote = useRef(false);
  useEffect(() => {
    if (!remote || loadedRemote.current) return;
    loadedRemote.current = true;
    setLoading("Pobieranie modelu ze zlecenia…");
    fetch(remote.url)
      .then((r) => {
        if (!r.ok) throw new Error("Nie udało się pobrać modelu.");
        return r.blob();
      })
      .then((b) => open([new File([b], remote.name)], false))
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Nie udało się pobrać modelu.");
        setLoading(null);
      });
  }, [remote, open]);

  return (
    <div className="two-col slicer">
      {ordering && (
        <div className="order-overlay" role="status">
          <span className="spinner" /> {ordering}
        </div>
      )}
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
          {view ? (
            <div className="viewer-wrap">
              <Viewer positions={view.pos} overhang={view.ov} showOverhangs={showOverhangs} colors={view.col} beds={view.beds} />
              {plan && plan.plates.length > 1 && (
                <div className="plate-tags mono">
                  {plan.plates.map((p) => <span key={p.label}>{p.label}</span>)}
                </div>
              )}
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
          ) : model ? (
            <div className="viewer" />
          ) : (
            <button type="button" className="drop-cta" onClick={() => pick(false)} disabled={!!loading}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
                <path d="M20 26V8M13 15l7-7 7 7" />
                <path d="M6 26v6h28v-6" />
              </svg>
              <b>Przeciągnij plik tutaj lub kliknij, aby wybrać</b>
              <span className="mono dim">STL · 3MF · STEP — plik nie opuszcza Twojej przeglądarki</span>
              <span className="mono dim">Wielokolorowy: 3MF z kolorami albo kilka plików naraz (jeden plik = jedna część)</span>
            </button>
          )}
          {(loading || busy) && (
            <div className="viewer-status mono">
              <span className="spinner" /> {loading ?? "Liczenie…"}
            </div>
          )}
        </div>

        {error && <div className="alert" role="alert">{error}</div>}

        {model && (
          <div className="panel">
            <div className="panel-head">
              <span className="mono">03 · Filamenty i części</span>
              <span className="mono dim">{multi ? `${usedFilaments.length} filamenty w użyciu` : "jeden filament"}</span>
            </div>
            <div className="panel-body stack-sm">
              <div>
                <span className="label">Filamenty</span>
                <ul className="color-list">
                  {filaments.map((f, i) => (
                    <li key={i} className="filament-row">
                      <input type="color" className="color-input" value={f.color} aria-label={`Kolor: ${f.label}`} onChange={(e) => setFilament(i, { color: e.target.value })} />
                      <input className="input input-sm" value={f.label} aria-label="Nazwa filamentu" onChange={(e) => setFilament(i, { label: e.target.value })} />
                      <select className="select select-sm" value={f.material} aria-label={`Materiał: ${f.label}`} onChange={(e) => setFilament(i, { material: e.target.value as MaterialId })}>
                        {Object.entries(MATERIALS).map(([id, m]) => <option key={id} value={id}>{m.name}</option>)}
                      </select>
                      <span className="mono dim num">{plan ? (plan.grams[i] > 0.0001 ? grams(plan.grams[i] * q) : "—") : ""}</span>
                    </li>
                  ))}
                </ul>
                <button type="button" className="btn btn-ghost btn-sm add-btn" onClick={addFilament}>
                  + Dodaj filament
                </button>
              </div>

              <div>
                <span className="label">Części ({model.items.length})</span>
                <ul className="color-list">
                  {model.items.map((it, i) => {
                    const fromFile = itemGroups[i] ?? [];
                    const multiFile = new Set(fromFile.map((g) => groupFilament[g])).size > 1;
                    const current = itemOverride[i];
                    const shown = current ?? (multiFile ? null : groupFilament[fromFile[0]] ?? 0);
                    const plate = plan?.plates.findIndex((p) => p.items.includes(i)) ?? -1;
                    return (
                      <li key={i} className="part-row">
                        <i className={`dot${shown === null ? " multi" : ""}`} style={shown !== null ? { background: filaments[shown]?.color } : undefined} />
                        <span className="ellipsis" title={it.name}>{it.name}</span>
                        <select className="select select-sm" value={current === null ? "file" : String(current)} aria-label={`Filament części ${it.name}`}
                          onChange={(e) => setItemOverride((ov) => ov.map((v, j) => (j === i ? (e.target.value === "file" ? null : +e.target.value) : v)))}>
                          <option value="file">{multiFile ? `Z pliku (${new Set(fromFile.map((g) => groupFilament[g])).size} kolory)` : `Z pliku · ${filaments[groupFilament[fromFile[0]] ?? 0]?.label ?? ""}`}</option>
                          {filaments.map((f, j) => <option key={j} value={j}>{f.label} · {MATERIALS[f.material].name}</option>)}
                        </select>
                        <span className="mono dim num">{plan && plan.plates.length > 1 && plate >= 0 ? `stół ${plate + 1}` : ""}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {multi && (
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
                  {plan && (
                    <div className="spec">
                      <div className="spec-row"><span>{mode === "manual" ? "Ręczne zmiany filamentu" : "Zmiany koloru"}</span><span>{fmt(plan.changes * q)}</span></div>
                      {mode !== "manual" && <div className="spec-row"><span>Odpad (płukanie + wieża)</span><span>{grams(plan.wasteGrams * q)}</span></div>}
                      {mode !== "manual" && <div className="spec-row"><span>Dodatkowy czas</span><span>{formatDuration(extraSeconds * q)}</span></div>}
                    </div>
                  )}
                  {plan && mode === "manual" && plan.plates.some((p) => p.cs.mixedLayers > 0) && (
                    <div className="alert warn">
                      {fmt(plan.plates.reduce((a, p) => a + p.cs.mixedLayers, 0))} warstw ma więcej niż jeden kolor — ręczna zmiana na wysokości tego nie wydrukuje. Potrzebny AMS/MMU albo zmieniacz narzędzi.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {model && (
          <div className="panel">
            <div className="panel-head">
              <span className="mono">04 · Stół i rozmieszczenie</span>
              <span className="mono dim">{plan ? plates(plan.plates.length) : ""}</span>
            </div>
            <div className="panel-body stack-sm">
              <div className="field">
                <label htmlFor="bed">Drukarka (stół)</label>
                <select className="select" id="bed" value={bedId} onChange={(e) => setBedId(e.target.value)}>
                  {BEDS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="field">
                <span className="label">Rozmieszczenie</span>
                <div className="seg">
                  <label className={effPlateMode === "perColor" ? "disabled" : ""}>
                    <input type="radio" name="placement" checked={effPlacement === "file"} disabled={effPlateMode === "perColor"} onChange={() => setPlacement("file")} />
                    <b>Jak w pliku</b>
                    <span>układ z 3MF / CAD bez zmian</span>
                  </label>
                  <label>
                    <input type="radio" name="placement" checked={effPlacement === "auto"} onChange={() => setPlacement("auto")} />
                    <b>Automatycznie</b>
                    <span>bez kolizji, jak najciaśniej</span>
                  </label>
                </div>
              </div>
              {effPlacement === "auto" && (
                <div className="field inline-field">
                  <label htmlFor="gap">Odstęp między częściami (mm)</label>
                  <input id="gap" className="input" type="number" min={1} max={30} step={1} value={gap} onChange={(e) => setGap(Math.max(1, Math.min(30, Math.round(+e.target.value) || 1)))} />
                </div>
              )}
              <div className="field">
                <span className="label">Stoły</span>
                <div className="seg">
                  <label>
                    <input type="radio" name="plates" checked={effPlateMode === "single"} onChange={() => setPlateMode("single")} />
                    <b>Wspólny stół</b>
                    <span>wszystkie kolory razem</span>
                  </label>
                  <label className={splittable ? "" : "disabled"} title={splittable ? "" : "Potrzebne co najmniej dwie części w różnych kolorach"}>
                    <input type="radio" name="plates" checked={effPlateMode === "perColor"} disabled={!splittable} onChange={() => setPlateMode("perColor")} />
                    <b>Kolor na osobnym stole</b>
                    <span>{splittable ? "bez zmian koloru i odpadu" : "wymaga części w różnych kolorach"}</span>
                  </label>
                </div>
              </div>

              {fileCheck && fileCheck.overlaps.length > 0 && (
                <div className="alert warn action-alert">
                  <span>
                    Części nachodzą na siebie:{" "}
                    {fileCheck.overlaps.slice(0, 4).map(([a, b]) => `${names[a]} ↔ ${names[b]}`).join(", ")}
                    {fileCheck.overlaps.length > 4 ? ` i ${fileCheck.overlaps.length - 4} więcej` : ""}. Jeśli to elementy jednego wydruku wielokolorowego, zostaw układ z pliku.
                  </span>
                  <button type="button" className="btn btn-sm" onClick={() => setPlacement("auto")}>Rozmieść automatycznie</button>
                </div>
              )}
              {fileCheck && !fileCheck.fits && (
                <div className="alert warn action-alert">
                  <span>Układ z pliku zajmuje {fmt(fileCheck.size[0])} × {fmt(fileCheck.size[1])} mm — nie mieści się na stole {bed.w} × {bed.d} mm.</span>
                  <button type="button" className="btn btn-sm" onClick={() => setPlacement("auto")}>Rozmieść automatycznie</button>
                </div>
              )}
              {fileCheck && fileCheck.tooTall.length > 0 && (
                <div className="alert warn">Za wysokie dla tej drukarki (max {bed.h} mm): {fileCheck.tooTall.map((i) => names[i]).join(", ")}.</div>
              )}
              {plan && plan.oversize.length > 0 && (
                <div className="alert warn">Nie mieści się na stole {bed.w} × {bed.d} mm: {plan.oversize.map((i) => names[i]).join(", ")}.</div>
              )}

              {singleTotal && perColorTotal && (
                <div className="compare">
                  <div className={effPlateMode === "single" ? "on" : ""}>
                    <span className="mono dim">Wspólny stół</span>
                    <b>{formatDuration(singleTotal.seconds * q)}</b>
                    <span className="mono dim">{plates(singleTotal.plates.length)} · odpad {grams(singleTotal.wasteGrams * q)} · {fmt(singleTotal.changes * q)} {plural(singleTotal.changes * q, "zmiana", "zmiany", "zmian")}</span>
                  </div>
                  <div className={effPlateMode === "perColor" ? "on" : ""}>
                    <span className="mono dim">Kolor na osobnym stole</span>
                    <b>{formatDuration(perColorTotal.seconds * q)}</b>
                    <span className="mono dim">{plates(perColorTotal.plates.length)} · odpad {grams(perColorTotal.wasteGrams * q)} · {fmt(perColorTotal.changes * q)} {plural(perColorTotal.changes * q, "zmiana", "zmiany", "zmian")}</span>
                  </div>
                  <p className="mono dim">
                    {perColorTotal.seconds < singleTotal.seconds
                      ? `Osobne stoły oszczędzają ${formatDuration((singleTotal.seconds - perColorTotal.seconds) * q)} i ${grams(Math.max(0, singleTotal.wasteGrams - perColorTotal.wasteGrams) * q)} filamentu, ale wymagają ${perColorTotal.plates.length - 1 === 1 ? "jednej wymiany" : `${perColorTotal.plates.length - 1} wymian`} stołu.`
                      : `Wspólny stół jest szybszy o ${formatDuration((perColorTotal.seconds - singleTotal.seconds) * q)} — każdy dodatkowy stół to osobne nagrzewanie i start.`}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {plan && (
          <>
            <div className="kpis slicer-kpis">
              <div className="kpi">
                <span className="mono dim">Czas druku{q > 1 ? ` · ${q} szt.` : ""}</span>
                <b>{formatDuration(plan.seconds * q)}</b>
                <span className="mono dim">
                  {plan.plates.length > 1 ? plates(plan.plates.length) : q > 1 ? `${formatDuration(plan.seconds)} / szt.` : extraSeconds > 0 ? `w tym zmiany koloru ${formatDuration(extraSeconds)}` : " "}
                </span>
              </div>
              <div className="kpi">
                <span className="mono dim">Filament{q > 1 ? ` · ${q} szt.` : ""}</span>
                <b>{grams(totalGrams * q)}</b>
                <span className="mono dim">{fmt(plan.meters * q, 2)} m{multi ? ` · ${usedFilaments.length} filamenty` : ` · ${MATERIALS[filaments[usedFilaments[0] ?? 0]?.material ?? "PLA"].name}`}</span>
              </div>
              <div className="kpi">
                <span className="mono dim">{plan.wasteGrams > 0 ? "Podpory / odpad" : "W tym podpory"}</span>
                <b>
                  {settings.supports === "none" ? "—" : grams(supportGrams * q)}
                  {plan.wasteGrams > 0 && <> / {grams(plan.wasteGrams * q)}</>}
                </b>
                <span className="mono dim">
                  {settings.supports === "none" ? "podpory wyłączone" : supportGrams > 0 ? `${fmt(plan.plates.reduce((a, p) => a + p.est.overhangArea, 0) / 100, 1)} cm² nawisów` : "podpory niepotrzebne"}
                </span>
              </div>
            </div>

            {plan.plates.length > 1 && (
              <div className="plates-table">
                <div className="mono dim"><span>Stół</span><span>Części</span><span>Czas</span><span>Filament</span><span>Zmiany</span></div>
                {plan.plates.map((p) => (
                  <div key={p.label}>
                    <span>{p.label}</span>
                    <span>{p.items.length}</span>
                    <span>{formatDuration(p.seconds * q)}</span>
                    <span>{grams((p.grams.reduce((a, g) => a + g, 0) + p.wasteGrams) * q)}</span>
                    <span>{fmt(p.cs.changes * q)}</span>
                  </div>
                ))}
              </div>
            )}

            {one && (
              <div className="specs">
                <div><span className="mono dim">Wymiary</span><div className="v">{one.est.size.map((v) => fmt(v, 1)).join(" × ")} mm</div></div>
                <div><span className="mono dim">Objętość bryły</span><div className="v">{fmt(one.est.volume / 1000, 1)} cm³</div></div>
                <div><span className="mono dim">Warstwy</span><div className="v">{fmt(one.est.layers)} × {settings.layerHeight} mm</div></div>
                <div><span className="mono dim">Trójkąty</span><div className="v">{fmt(one.est.triangles)}</div></div>
                <div><span className="mono dim">Obrysy</span><div className="v">{fmt(one.est.shell / 1000, 1)} cm³</div></div>
                <div><span className="mono dim">Wypełnienie</span><div className="v">{fmt(one.est.infill / 1000, 1)} cm³</div></div>
                <div><span className="mono dim">Podpory</span><div className="v">{fmt(one.est.support / 1000, 1)} cm³</div></div>
                <div><span className="mono dim">Długość filamentu</span><div className="v">{fmt(one.meters, 2)} m</div></div>
              </div>
            )}

            {Array.from(new Set(plan.plates.flatMap((p) => p.est.warnings))).map((w) => (
              <div key={w} className="alert warn">{w}</div>
            ))}
            <p className="mono dim slicer-note">
              Szacunek bez slicowania — zwykle ±20–30% względem PrusaSlicera/OrcaSlicera{multi ? "; odpad przy zmianie koloru zależy też od pary kolorów" : ""}. Dokładną wycenę poda drukarz.
            </p>
          </>
        )}
      </div>

      <aside className="panel sticky">
        <div className="panel-head"><span className="mono">02 · Ustawienia druku</span></div>
        <div className="panel-body form">
          <div className="form-grid">
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
            {model && (
              <div className="field">
                <label htmlFor="unit">Jednostki pliku</label>
                <select className="select" id="unit" value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
                  <option value="mm">mm</option>
                  <option value="cm">cm</option>
                  <option value="m">m</option>
                  <option value="in">cale</option>
                </select>
              </div>
            )}
          </div>

          <div className="field">
            <label htmlFor="infill">Wypełnienie: {settings.infill}%</label>
            <input id="infill" className="range" type="range" min={0} max={100} step={5} value={settings.infill} onChange={(e) => set("infill", +e.target.value)} />
          </div>

          <div className="field">
            <span className="label">Prędkość drukarki</span>
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

          <p className="hint">Materiał i kolor ustawiasz dla każdego filamentu w sekcji „Filamenty i części”.</p>

          <button type="button" className="btn btn-primary btn-lg" onClick={addToOrder} disabled={!plan || busy || !!ordering}>
            {ordering ? "Tworzenie zamówienia…" : "Dodaj do zamówienia →"}
          </button>
          <p className="hint">
            {plan
              ? account
                ? "Zapiszemy ustawienia i model w zamówieniu. W następnym kroku dodasz termin, budżet i szczegóły."
                : "Zaloguj się, aby dodać do zamówienia — Twój model i ustawienia poczekają."
              : "Wgraj model, aby dodać go do zamówienia."}
          </p>
        </div>
      </aside>
    </div>
  );
}
