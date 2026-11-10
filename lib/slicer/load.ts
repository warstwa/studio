// Wczytywanie STL / 3MF / STEP w przeglądarce.
// Siatka to „zupa trójkątów” (Float32Array, 9 liczb na trójkąt, mm) + kolor (grupa) i bryła każdego trójkąta.
import type { BufferGeometry } from "three";
import { parse3mf } from "./threemf";

export const ACCEPT = ".stl,.3mf,.step,.stp";

export const PALETTE = ["#2fd16a", "#f2f1ec", "#ef6b5e", "#7fb2ff", "#f0b54a", "#b28dff", "#3a3a40", "#ff9ad5"];

/** Grupa = jeden filament/kolor. */
export type Group = { label: string; color: string };

export type Model = {
  name: string;
  positions: Float32Array;
  /** Indeks grupy (koloru) każdego trójkąta. */
  group: Uint8Array;
  /** Indeks bryły każdego trójkąta – wypełnienie bryły drukuje się kolorem bazowym. */
  object: Uint16Array;
  /** Grupa bazowa (wnętrze) każdej bryły. */
  objectBase: number[];
  groups: Group[];
};

export async function loadModel(file: File): Promise<Model> {
  const ext = file.name.toLowerCase().split(".").pop();
  const buffer = await file.arrayBuffer();
  const label = file.name;
  let model: Model;
  if (ext === "stl") model = single(label, await loadStl(buffer));
  else if (ext === "3mf") model = await load3mf(buffer, label);
  else if (ext === "step" || ext === "stp") model = await loadStep(buffer, label);
  else throw new Error(`Nieobsługiwany format pliku ${file.name}. Wybierz STL, 3MF lub STEP.`);
  if (model.positions.length < 9) throw new Error(`Plik ${file.name} nie zawiera żadnej siatki do druku.`);
  return { ...model, name: file.name };
}

/** Łączy części (np. kilka plików STL – każdy w innym kolorze). Współrzędne zostają bez zmian. */
export function mergeModels(a: Model, b: Model): Model {
  const ta = a.group.length, tb = b.group.length;
  const group = new Uint8Array(ta + tb);
  group.set(a.group);
  const object = new Uint16Array(ta + tb);
  object.set(a.object);
  const go = a.groups.length, oo = a.objectBase.length;
  for (let i = 0; i < tb; i++) {
    group[ta + i] = Math.min(255, b.group[i] + go);
    object[ta + i] = Math.min(65535, b.object[i] + oo);
  }
  const groups = [...a.groups, ...b.groups].map((g, i) =>
    // nowa część z domyślnym kolorem dostaje kolejny kolor z palety
    i >= go && g.color === PALETTE[0] && b.groups.length === 1 ? { ...g, color: PALETTE[i % PALETTE.length] } : g,
  );
  return {
    name: `${a.name} + ${b.name}`,
    positions: concat([a.positions, b.positions]),
    group,
    object,
    objectBase: [...a.objectBase, ...b.objectBase.map((g) => g + go)],
    groups,
  };
}

function single(label: string, positions: Float32Array): Model {
  const n = positions.length / 9;
  return { name: label, positions, group: new Uint8Array(n), object: new Uint16Array(n), objectBase: [0], groups: [{ label, color: PALETTE[0] }] };
}

async function loadStl(buffer: ArrayBuffer) {
  const { STLLoader } = await import("three/addons/loaders/STLLoader.js");
  return soup(new STLLoader().parse(buffer));
}

async function load3mf(buffer: ArrayBuffer, label: string): Promise<Model> {
  const { unzipSync } = await import("three/addons/libs/fflate.module.js");
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(buffer));
  } catch {
    throw new Error("Nie udało się odczytać pliku 3MF (uszkodzone archiwum).");
  }
  const r = parse3mf(files, (xml) => new DOMParser().parseFromString(xml, "application/xml"));
  const groups = r.groups.map((g, i) => ({ label: g.label ?? (r.groups.length === 1 ? label : `Kolor ${i + 1}`), color: g.color ?? PALETTE[i % PALETTE.length] }));
  return { name: label, positions: r.positions, group: r.group, object: r.object, objectBase: r.objectBase, groups };
}

type OcctMesh = { attributes: { position: { array: number[] } }; index?: { array: number[] }; color?: number[]; name?: string };
type Occt = { ReadStepFile: (data: Uint8Array, params: unknown) => { success: boolean; meshes: OcctMesh[] } };
let occtPromise: Promise<Occt> | null = null;

/** OpenCascade (WASM, ~7,6 MB) ładowany dopiero przy pierwszym pliku STEP. Pliki kopiuje scripts/copy-occt.mjs. */
function occt(): Promise<Occt> {
  if (!occtPromise) {
    occtPromise = new Promise<Occt>((resolve, reject) => {
      const w = window as unknown as { occtimportjs?: (o: object) => Promise<Occt> };
      const init = () => w.occtimportjs!({ locateFile: (f: string) => `/occt/${f}` }).then(resolve, reject);
      if (w.occtimportjs) return init();
      const s = document.createElement("script");
      s.src = "/occt/occt-import-js.js";
      s.onload = init;
      s.onerror = () => reject(new Error("Nie udało się załadować modułu STEP."));
      document.head.appendChild(s);
    }).catch((e) => {
      occtPromise = null;
      throw e;
    });
  }
  return occtPromise;
}

async function loadStep(buffer: ArrayBuffer, label: string): Promise<Model> {
  const lib = await occt();
  const res = lib.ReadStepFile(new Uint8Array(buffer), {
    linearUnit: "millimeter",
    linearDeflectionType: "bounding_box_ratio",
    linearDeflection: 0.001,
    angularDeflection: 0.25,
  });
  if (!res.success) throw new Error("Nie udało się odczytać pliku STEP.");
  // Każde ciało STEP to osobna bryła; ciała o różnych kolorach z CAD trafiają do osobnych grup.
  const colorKeys: string[] = [];
  const parts: Float32Array[] = [];
  const partGroup: number[] = [];
  for (const m of res.meshes) {
    const p = m.attributes.position.array;
    const idx = m.index?.array;
    let out: Float32Array;
    if (!idx) out = Float32Array.from(p);
    else {
      out = new Float32Array(idx.length * 3);
      for (let i = 0; i < idx.length; i++) {
        out[i * 3] = p[idx[i] * 3];
        out[i * 3 + 1] = p[idx[i] * 3 + 1];
        out[i * 3 + 2] = p[idx[i] * 3 + 2];
      }
    }
    const key = m.color ? rgbHex(m.color) : "";
    let g = colorKeys.indexOf(key);
    if (g < 0) g = colorKeys.push(key) - 1;
    parts.push(out);
    partGroup.push(g);
  }
  const positions = concat(parts);
  const n = positions.length / 9;
  const group = new Uint8Array(n);
  const object = new Uint16Array(n);
  let t = 0;
  parts.forEach((p, i) => {
    group.fill(Math.min(255, partGroup[i]), t, t + p.length / 9);
    object.fill(Math.min(65535, i), t, t + p.length / 9);
    t += p.length / 9;
  });
  const groups = colorKeys.map((c, i) => ({ label: colorKeys.length === 1 ? label : `Kolor ${i + 1}`, color: c || PALETTE[i % PALETTE.length] }));
  return { name: label, positions, group, object, objectBase: partGroup, groups };
}

function rgbHex(c: number[]) {
  const k = c.some((v) => v > 1) ? 1 : 255;
  return "#" + c.slice(0, 3).map((v) => Math.round(v * k).toString(16).padStart(2, "0")).join("");
}

function soup(g: BufferGeometry): Float32Array {
  const geo = g.index ? g.toNonIndexed() : g;
  const arr = geo.getAttribute("position").array as ArrayLike<number>;
  return arr instanceof Float32Array ? arr : Float32Array.from(arr);
}

export function concat(parts: Float32Array[]) {
  const out = new Float32Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
