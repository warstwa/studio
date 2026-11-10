// Rozmieszczanie części na stole: rzut części na siatkę XY, wykrywanie kolizji i ciasne pakowanie.

export type Bed = { id: string; name: string; w: number; d: number; h: number };

export const BEDS: Bed[] = [
  { id: "bambu", name: "Bambu Lab X1 / P1 / P2 / A1 · 256 × 256", w: 256, d: 256, h: 256 },
  { id: "a1mini", name: "Bambu Lab A1 mini · 180 × 180", w: 180, d: 180, h: 180 },
  { id: "mk4", name: "Prusa MK4 / MK3 · 250 × 210", w: 250, d: 210, h: 220 },
  { id: "coreone", name: "Prusa Core One · 250 × 220", w: 250, d: 220, h: 270 },
  { id: "xl", name: "Prusa XL · 360 × 360", w: 360, d: 360, h: 360 },
  { id: "ender3", name: "Creality Ender 3 · 220 × 220", w: 220, d: 220, h: 250 },
  { id: "k1max", name: "Creality K1 Max · 300 × 300", w: 300, d: 300, h: 300 },
  { id: "voron350", name: "Voron 2.4 · 350 × 350", w: 350, d: 350, h: 340 },
];

/** Przekształcenie części: obrót o 90° wokół Z (opcjonalnie), przesunięcie, postawienie na stole. */
export type Placement = { plate: number; rot: boolean; dx: number; dy: number; dz: number };

/** Indeksy trójkątów każdej części. */
export function itemTriangles(item: Uint16Array, count: number): Uint32Array[] {
  const sizes = new Uint32Array(count);
  for (let t = 0; t < item.length; t++) sizes[item[t]]++;
  const out = Array.from(sizes, (n) => new Uint32Array(n));
  const fill = new Uint32Array(count);
  for (let t = 0; t < item.length; t++) out[item[t]][fill[item[t]]++] = t;
  return out;
}

export function itemBounds(pos: Float32Array, tris: Uint32Array) {
  const b = { minX: Infinity, minY: Infinity, minZ: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity };
  for (const t of tris)
    for (let k = 0; k < 9; k += 3) {
      const x = pos[t * 9 + k], y = pos[t * 9 + k + 1], z = pos[t * 9 + k + 2];
      if (x < b.minX) b.minX = x; if (x > b.maxX) b.maxX = x;
      if (y < b.minY) b.minY = y; if (y > b.maxY) b.maxY = y;
      if (z < b.minZ) b.minZ = z; if (z > b.maxZ) b.maxZ = z;
    }
  return b;
}

/** Zwraca pozycje trójkątów części po przekształceniu (w kolejności `tris`). */
export function transformItem(pos: Float32Array, tris: Uint32Array, p: Placement, out: Float32Array, offset: number) {
  let o = offset;
  for (const t of tris)
    for (let k = 0; k < 9; k += 3) {
      const x = pos[t * 9 + k], y = pos[t * 9 + k + 1], z = pos[t * 9 + k + 2];
      out[o++] = (p.rot ? -y : x) + p.dx;
      out[o++] = (p.rot ? x : y) + p.dy;
      out[o++] = z + p.dz;
    }
  return o;
}

type Foot = { w: number; h: number; cells: Uint8Array; x0: number; y0: number; filled: number };

/** Rzut części na siatkę (rozdzielczość `res` mm) z marginesem `margin` komórek. */
function footprint(pos: Float32Array, tris: Uint32Array, res: number, rot: boolean, margin: number): Foot {
  const X = (t: number, k: number) => (rot ? -pos[t * 9 + k * 3 + 1] : pos[t * 9 + k * 3]);
  const Y = (t: number, k: number) => (rot ? pos[t * 9 + k * 3] : pos[t * 9 + k * 3 + 1]);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const t of tris)
    for (let k = 0; k < 3; k++) {
      const x = X(t, k), y = Y(t, k);
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  const x0 = minX - margin * res, y0 = minY - margin * res;
  const w = Math.ceil((maxX - minX) / res) + 1 + 2 * margin;
  const h = Math.ceil((maxY - minY) / res) + 1 + 2 * margin;
  const raw = new Uint8Array(w * h);
  for (const t of tris) {
    const ax = (X(t, 0) - x0) / res, ay = (Y(t, 0) - y0) / res;
    const bx = (X(t, 1) - x0) / res, by = (Y(t, 1) - y0) / res;
    const cx = (X(t, 2) - x0) / res, cy = (Y(t, 2) - y0) / res;
    const i0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), i1 = Math.min(w - 1, Math.floor(Math.max(ax, bx, cx)));
    const j0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), j1 = Math.min(h - 1, Math.floor(Math.max(ay, by, cy)));
    // wierzchołki zawsze zaznaczone (pionowe ściany rzutują się na odcinki)
    raw[Math.floor(ay) * w + Math.floor(ax)] = raw[Math.floor(by) * w + Math.floor(bx)] = raw[Math.floor(cy) * w + Math.floor(cx)] = 1;
    const det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (i1 - i0 <= 1 && j1 - j0 <= 1) {
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) raw[j * w + i] = 1;
      continue;
    }
    if (Math.abs(det) < 1e-9) {
      // zdegenerowany rzut (pionowa ściana) – zaznacz odcinek
      const steps = Math.ceil(Math.max(i1 - i0, j1 - j0)) * 2 + 1;
      for (const [px, py, qx, qy] of [[ax, ay, bx, by], [bx, by, cx, cy], [cx, cy, ax, ay]])
        for (let s = 0; s <= steps; s++) {
          const u = s / steps;
          raw[Math.floor(py + (qy - py) * u) * w + Math.floor(px + (qx - px) * u)] = 1;
        }
      continue;
    }
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const px = i + 0.5, py = j + 0.5;
        const l1 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / det;
        const l2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / det;
        if (l1 >= -0.05 && l2 >= -0.05 && 1 - l1 - l2 >= -0.05) raw[j * w + i] = 1;
      }
  }
  const cells = margin > 0 ? dilate(raw, w, h, margin) : raw;
  let filled = 0;
  for (let i = 0; i < cells.length; i++) filled += cells[i];
  return { w, h, cells, x0, y0, filled };
}

function dilate(src: Uint8Array, w: number, h: number, r: number) {
  const tmp = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) {
    let last = -1e9;
    for (let i = 0; i < w; i++) {
      if (src[j * w + i]) last = i;
      if (i - last <= r) tmp[j * w + i] = 1;
    }
    last = 1e9;
    for (let i = w - 1; i >= 0; i--) {
      if (src[j * w + i]) last = i;
      if (last - i <= r) tmp[j * w + i] = 1;
    }
  }
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w; i++) {
    let last = -1e9;
    for (let j = 0; j < h; j++) {
      if (tmp[j * w + i]) last = j;
      if (j - last <= r) out[j * w + i] = 1;
    }
    last = 1e9;
    for (let j = h - 1; j >= 0; j--) {
      if (tmp[j * w + i]) last = j;
      if (last - j <= r) out[j * w + i] = 1;
    }
  }
  return out;
}

/** Pary części, których rzuty na stół nachodzą na siebie (układ jak w pliku). */
export function findOverlaps(pos: Float32Array, itemTris: Uint32Array[]): [number, number][] {
  const all = itemTris.filter((t) => t.length);
  if (all.length < 2) return [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const tris of itemTris) {
    if (!tris.length) continue;
    const b = itemBounds(pos, tris);
    minX = Math.min(minX, b.minX); minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX); maxY = Math.max(maxY, b.maxY);
  }
  const res = Math.max(0.5, Math.max(maxX - minX, maxY - minY) / 400);
  const gw = Math.ceil((maxX - minX) / res) + 2, gh = Math.ceil((maxY - minY) / res) + 2;
  const owner = new Int32Array(gw * gh).fill(-1);
  const counts = new Map<string, number>();
  itemTris.forEach((tris, id) => {
    if (!tris.length) return;
    const f = footprint(pos, tris, res, false, 0);
    const ox = Math.round((f.x0 - minX) / res), oy = Math.round((f.y0 - minY) / res);
    for (let j = 0; j < f.h; j++)
      for (let i = 0; i < f.w; i++) {
        if (!f.cells[j * f.w + i]) continue;
        const gx = ox + i, gy = oy + j;
        if (gx < 0 || gy < 0 || gx >= gw || gy >= gh) continue;
        const c = gy * gw + gx;
        const prev = owner[c];
        if (prev >= 0 && prev !== id) {
          const k = prev < id ? `${prev}-${id}` : `${id}-${prev}`;
          counts.set(k, (counts.get(k) ?? 0) + 1);
        } else owner[c] = id;
      }
  });
  // kilka wspólnych komórek to tylko styk krawędzi
  return Array.from(counts).filter(([, n]) => n > 3).map(([k]) => k.split("-").map(Number) as [number, number]);
}

export type Layout = {
  placements: (Placement | null)[];
  plates: { items: number[]; label: string }[];
  /** Części większe niż stół – położone na osobnych stołach, ale nie zmieszczą się. */
  oversize: number[];
};

/**
 * Pakuje części na stoły. `groups` dzieli części na zestawy, które nie mogą dzielić stołu
 * (np. „każdy kolor na osobnym stole”); w obrębie zestawu otwierane są kolejne stoły, gdy brak miejsca.
 * Na każdym stole wybieramy pozycję minimalizującą pole prostokąta obejmującego wszystkie części,
 * na koniec środkujemy układ na stole.
 */
export function arrange(pos: Float32Array, itemTris: Uint32Array[], bed: Bed, gap: number, groups: { items: number[]; label: string }[]): Layout {
  const res = Math.max(1, Math.max(bed.w, bed.d) / 220);
  const margin = Math.max(0, Math.ceil(gap / 2 / res));
  const gw = Math.floor(bed.w / res), gd = Math.floor(bed.d / res);
  const placements: (Placement | null)[] = itemTris.map(() => null);
  const plates: Layout["plates"] = [];
  const oversize: number[] = [];

  type PlateState = { occ: Uint8Array; sat: Int32Array; maxX: number; maxY: number; index: number; placed: { item: number; i: number; j: number; f: Foot; rot: boolean }[] };

  const buildSat = (occ: Uint8Array) => {
    const sat = new Int32Array((gw + 1) * (gd + 1));
    for (let j = 0; j < gd; j++) {
      let row = 0;
      for (let i = 0; i < gw; i++) {
        row += occ[j * gw + i];
        sat[(j + 1) * (gw + 1) + i + 1] = sat[j * (gw + 1) + i + 1] + row;
      }
    }
    return sat;
  };
  const rectSum = (sat: Int32Array, i: number, j: number, w: number, h: number) =>
    sat[(j + h) * (gw + 1) + i + w] - sat[j * (gw + 1) + i + w] - sat[(j + h) * (gw + 1) + i] + sat[j * (gw + 1) + i];
  const fits = (ps: PlateState, f: Foot, i: number, j: number) => {
    if (rectSum(ps.sat, i, j, f.w, f.h) === 0) return true;
    for (let y = 0; y < f.h; y++) {
      const row = (j + y) * gw + i, frow = y * f.w;
      for (let x = 0; x < f.w; x++) if (f.cells[frow + x] && ps.occ[row + x]) return false;
    }
    return true;
  };

  const feet = itemTris.map((tris) => (tris.length ? [footprint(pos, tris, res, false, margin), footprint(pos, tris, res, true, margin)] : null));

  for (const g of groups) {
    const order = g.items.filter((it) => feet[it]).sort((a, b) => feet[b]![0].filled - feet[a]![0].filled);
    const mine: PlateState[] = [];
    const open = () => {
      const ps: PlateState = { occ: new Uint8Array(gw * gd), sat: new Int32Array((gw + 1) * (gd + 1)), maxX: 0, maxY: 0, index: plates.length, placed: [] };
      plates.push({ items: [], label: g.label });
      mine.push(ps);
      return ps;
    };
    for (const it of order) {
      const opts = feet[it]!.map((f, r) => ({ f, rot: r === 1 })).filter((o) => o.f.w <= gw && o.f.h <= gd);
      if (!opts.length) {
        // za duża na stół – osobny stół, wyśrodkowana
        oversize.push(it);
        const ps = open();
        const f = feet[it]![0];
        ps.placed.push({ item: it, i: Math.floor((gw - f.w) / 2), j: Math.floor((gd - f.h) / 2), f, rot: false });
        plates[ps.index].items.push(it);
        continue;
      }
      let done = false;
      for (const ps of [...mine, null]) {
        const plate = ps ?? open();
        let best: { i: number; j: number; o: (typeof opts)[number]; score: number } | null = null;
        for (const o of opts) {
          for (let j = 0; j + o.f.h <= gd; j++)
            for (let i = 0; i + o.f.w <= gw; i++) {
              const score = Math.max(plate.maxX, i + o.f.w) * Math.max(plate.maxY, j + o.f.h) * 1e6 + j * gw + i;
              if (best && score >= best.score) continue;
              if (fits(plate, o.f, i, j)) best = { i, j, o, score };
            }
        }
        if (!best) continue;
        const { i, j, o } = best;
        for (let y = 0; y < o.f.h; y++) for (let x = 0; x < o.f.w; x++) if (o.f.cells[y * o.f.w + x]) plate.occ[(j + y) * gw + i + x] = 1;
        plate.sat = buildSat(plate.occ);
        plate.maxX = Math.max(plate.maxX, i + o.f.w);
        plate.maxY = Math.max(plate.maxY, j + o.f.h);
        plate.placed.push({ item: it, i, j, f: o.f, rot: o.rot });
        plates[plate.index].items.push(it);
        done = true;
        break;
      }
      if (!done) oversize.push(it);
    }
    // wyśrodkowanie i przeliczenie na mm
    for (const ps of mine) {
      if (!ps.placed.length) continue;
      const minI = Math.min(...ps.placed.map((p) => p.i)), minJ = Math.min(...ps.placed.map((p) => p.j));
      const maxI = Math.max(...ps.placed.map((p) => p.i + p.f.w)), maxJ = Math.max(...ps.placed.map((p) => p.j + p.f.h));
      const si = Math.floor((gw - (maxI - minI)) / 2) - minI, sj = Math.floor((gd - (maxJ - minJ)) / 2) - minJ;
      for (const p of ps.placed) {
        const b = itemBounds(pos, itemTris[p.item]);
        placements[p.item] = {
          plate: ps.index,
          rot: p.rot,
          dx: (p.i + si) * res - p.f.x0 + (bed.w - gw * res) / 2,
          dy: (p.j + sj) * res - p.f.y0 + (bed.d - gd * res) / 2,
          dz: -b.minZ,
        };
      }
    }
  }
  return { placements, plates, oversize };
}
