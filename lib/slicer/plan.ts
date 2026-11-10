// Plan druku: części → stoły (układ z pliku albo automatyczny, wspólny stół albo stół na kolor)
// i szacunek każdego stołu z filamentami o różnych materiałach.
import { arrange, findOverlaps, itemBounds, transformItem, type Bed, type Placement } from "./arrange";
import { MATERIALS, colorStats, estimate, printSeconds, type ColorStats, type Estimate, type MaterialId, type MultiMode, type PrintSettings } from "./estimate";

export type Filament = { label: string; color: string; material: MaterialId };
export type PlacementMode = "file" | "auto";
export type PlateMode = "single" | "perColor";

export type PlanInput = {
  positions: Float32Array; // po skalowaniu i obrotach
  itemTris: Uint32Array[];
  itemNames: string[];
  object: Uint16Array;
  /** Filament każdego trójkąta (po przypisaniach użytkownika). */
  triFilament: Uint8Array;
  /** Filament wnętrza każdej bryły. */
  objectFilament: number[];
  /** Jedyny filament części albo null, gdy część jest wielokolorowa. */
  itemFilament: (number | null)[];
  filaments: Filament[];
};

export type PlateLayout = { label: string; items: number[]; placements: (Placement | null)[] | null };

export type PlateResult = {
  label: string;
  items: number[];
  /** Pozycje trójkątów stołu we współrzędnych stołu (0..w, 0..d). */
  positions: Float32Array;
  triFilament: Uint8Array;
  est: Estimate;
  cs: ColorStats;
  seconds: number;
  grams: number[];
  wasteGrams: number;
  meters: number;
};

export type Plan = {
  plates: PlateResult[];
  seconds: number;
  grams: number[];
  wasteGrams: number;
  meters: number;
  changes: number;
  oversize: number[];
};

export function canSplitByColor(input: PlanInput) {
  return new Set(input.itemFilament.filter((f) => f !== null)).size > 1;
}

/** Układ stołów. Stół na kolor zawsze rozmieszcza automatycznie. */
export function layout(input: PlanInput, bed: Bed, placement: PlacementMode, plates: PlateMode, gap: number): { plates: PlateLayout[]; oversize: number[] } {
  const all = input.itemTris.map((_, i) => i).filter((i) => input.itemTris[i].length);
  if (placement === "file" && plates === "single") return { plates: [{ label: "Stół 1", items: all, placements: null }], oversize: [] };
  let groups = [{ items: all, label: "" }];
  if (plates === "perColor") {
    const keys = new Map<string, number[]>();
    for (const i of all) {
      const f = input.itemFilament[i];
      const k = f === null ? "mixed" : String(f);
      keys.set(k, [...(keys.get(k) ?? []), i]);
    }
    groups = Array.from(keys)
      .sort(([a], [b]) => (a === "mixed" ? 1 : b === "mixed" ? -1 : +a - +b))
      .map(([k, items]) => ({ items, label: k === "mixed" ? "Wielokolorowe" : input.filaments[+k].label }));
  }
  const l = arrange(input.positions, input.itemTris, bed, gap, groups);
  return {
    plates: l.plates.map((p, i) => ({ label: p.label ? `Stół ${i + 1} · ${p.label}` : `Stół ${i + 1}`, items: p.items, placements: l.placements })),
    oversize: l.oversize,
  };
}

export function evaluate(input: PlanInput, plates: PlateLayout[], oversize: number[], bed: Bed, s: PrintSettings, mode: MultiMode, waste: number): Plan {
  const F = input.filaments.length;
  const densities = input.filaments.map((f) => MATERIALS[f.material].density);
  const speeds = input.filaments.map((f) => MATERIALS[f.material].speedFactor);
  const filamentArea = Math.PI * (s.filamentDiameter / 2) ** 2;

  const results = plates.map((pl) => {
    const nTris = pl.items.reduce((a, i) => a + input.itemTris[i].length, 0);
    const positions = new Float32Array(nTris * 9);
    const triFilament = new Uint8Array(nTris);
    const object = new Uint16Array(nTris);
    const objMap = new Map<number, number>();
    const objectBase: number[] = [];
    let o = 0, t = 0;
    for (const it of pl.items) {
      const tris = input.itemTris[it];
      const p = pl.placements?.[it];
      if (p) o = transformItem(input.positions, tris, p, positions, o);
      else for (const tri of tris) for (let k = 0; k < 9; k++) positions[o++] = input.positions[tri * 9 + k];
      for (const tri of tris) {
        triFilament[t] = input.triFilament[tri];
        const ob = input.object[tri];
        let lo = objMap.get(ob);
        if (lo === undefined) {
          lo = objectBase.push(input.objectFilament[ob] ?? 0) - 1;
          objMap.set(ob, lo);
        }
        object[t++] = lo;
      }
    }
    if (!pl.placements) placeOnBed(positions, bed);
    const est = estimate(positions, s);
    const cs = colorStats(positions, triFilament, object, objectBase, F, est, s, mode, waste, densities);
    // Prędkość mieszanki materiałów: czas ∝ Σ objętość / współczynnik prędkości.
    const vol = cs.volumes.map((v, f) => v + (f === cs.main ? est.support : 0));
    const sum = vol.reduce((a, v) => a + v, 0);
    const slow = vol.reduce((a, v, f) => a + v / speeds[f], 0);
    const speed = sum > 0 && slow > 0 ? sum / slow : 1;
    const seconds = printSeconds(est.shell, est.infill, est.support, est.layers, s, speed) + cs.extraSeconds;
    const meters = (cs.grams.reduce((a, g, f) => a + g / densities[f], 0) * 1000 + (cs.wasteGrams / densities[cs.main]) * 1000) / filamentArea / 1000;
    return { label: pl.label, items: pl.items, positions, triFilament, est, cs, seconds, grams: cs.grams, wasteGrams: cs.wasteGrams, meters };
  });

  return {
    plates: results,
    seconds: results.reduce((a, r) => a + r.seconds, 0),
    grams: Array.from({ length: F }, (_, f) => results.reduce((a, r) => a + r.grams[f], 0)),
    wasteGrams: results.reduce((a, r) => a + r.wasteGrams, 0),
    meters: results.reduce((a, r) => a + r.meters, 0),
    changes: results.reduce((a, r) => a + r.cs.changes, 0),
    oversize,
  };
}

/** Układ z pliku: model stoi na stole, wyśrodkowany (pozycja stołu w pliku STL nie jest znana). */
function placeOnBed(pos: Float32Array, bed: Bed) {
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < pos.length; i += 3) {
    minX = Math.min(minX, pos[i]); maxX = Math.max(maxX, pos[i]);
    minY = Math.min(minY, pos[i + 1]); maxY = Math.max(maxY, pos[i + 1]);
    minZ = Math.min(minZ, pos[i + 2]);
  }
  const dx = bed.w / 2 - (minX + maxX) / 2, dy = bed.d / 2 - (minY + maxY) / 2;
  for (let i = 0; i < pos.length; i += 3) {
    pos[i] += dx;
    pos[i + 1] += dy;
    pos[i + 2] -= minZ;
  }
}

/** Problemy układu z pliku: kolizje części, wyjście poza stół, za wysokie części. */
export function checkFileLayout(input: PlanInput, bed: Bed) {
  const overlaps = findOverlaps(input.positions, input.itemTris);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const tooTall: number[] = [];
  input.itemTris.forEach((tris, i) => {
    if (!tris.length) return;
    const b = itemBounds(input.positions, tris);
    minX = Math.min(minX, b.minX); maxX = Math.max(maxX, b.maxX);
    minY = Math.min(minY, b.minY); maxY = Math.max(maxY, b.maxY);
    if (b.maxZ - b.minZ > bed.h) tooTall.push(i);
  });
  const w = maxX - minX, d = maxY - minY;
  const fits = (w <= bed.w && d <= bed.d) || (d <= bed.w && w <= bed.d);
  return { overlaps, fits, size: [w, d] as [number, number], tooTall };
}
