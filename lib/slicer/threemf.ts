// Czytnik 3MF z informacją o kolorach.
// Obsługuje: komponenty i pliki podrzędne (rozszerzenie Production – Bambu Studio / OrcaSlicer),
// przypisanie filamentu do obiektu/części (Bambu/Orca: Metadata/model_settings.config,
// PrusaSlicer: Metadata/Slic3r_PE_model.config), malowanie kolorów (paint_color / slic3rpe:mmu_segmentation),
// kolory filamentów z konfiguracji projektu oraz kolory materiałów 3MF (basematerials / colorgroup).

type Doc = Document;
type Mat = number[]; // 12 liczb: m00 m01 m02 m10 m11 m12 m20 m21 m22 m30 m31 m32 (wektory wierszowe)

const IDENTITY: Mat = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];

export type Parsed3mf = {
  positions: Float32Array;
  group: Uint8Array;
  object: Uint16Array;
  objectBase: number[];
  groups: { label?: string; color?: string }[];
  /** Część (pozycja z <build>) każdego trójkąta – jednostka, którą można przesuwać po stole. */
  item: Uint16Array;
  items: { name: string }[];
};

export function parse3mf(files: Record<string, Uint8Array>, parseXml: (xml: string) => Doc): Parsed3mf {
  const dec = new TextDecoder();
  const byLower = new Map(Object.keys(files).map((k) => [k.toLowerCase().replace(/^\//, ""), k]));
  const read = (path: string) => {
    const k = byLower.get(path.toLowerCase().replace(/^\//, ""));
    return k ? dec.decode(files[k]) : null;
  };

  // Główny model z _rels/.rels (zwykle 3D/3dmodel.model).
  let rootPath = "3D/3dmodel.model";
  const rels = read("_rels/.rels");
  if (rels) {
    const m = /Target="([^"]+\.model)"/i.exec(rels);
    if (m) rootPath = m[1].replace(/^\//, "");
  }
  const docs = new Map<string, Doc>();
  const doc = (path: string) => {
    const key = path.replace(/^\//, "").toLowerCase();
    if (!docs.has(key)) {
      const xml = read(path);
      if (!xml) throw new Error(`W pliku 3MF brakuje części ${path}.`);
      docs.set(key, parseXml(xml));
    }
    return docs.get(key)!;
  };
  const root = doc(rootPath);
  const unit = { micron: 0.001, millimeter: 1, centimeter: 10, meter: 1000, inch: 25.4, foot: 304.8 }[
    root.documentElement.getAttribute("unit") ?? "millimeter"
  ] ?? 1;

  const objectsIn = (d: Doc) => {
    const map = new Map<string, Element>();
    for (const o of Array.from(d.getElementsByTagName("object"))) map.set(o.getAttribute("id")!, o);
    return map;
  };
  const objIndex = new Map<string, Map<string, Element>>();
  const objectsOf = (path: string) => {
    const key = path.replace(/^\//, "").toLowerCase();
    if (!objIndex.has(key)) objIndex.set(key, objectsIn(doc(path)));
    return objIndex.get(key)!;
  };

  // Kolory materiałów 3MF (basematerials / colorgroup) – per dokument; nazwy materiałów jako etykiety.
  const colorNames = new Map<string, string>();
  const materialColors = (d: Doc) => {
    const map = new Map<string, string[]>();
    for (const bm of Array.from(d.getElementsByTagName("basematerials")))
      map.set(
        bm.getAttribute("id")!,
        Array.from(bm.getElementsByTagName("base")).map((b) => {
          const c = normColor(b.getAttribute("displaycolor"));
          const name = b.getAttribute("name");
          if (c && name && !colorNames.has(c)) colorNames.set(c, name);
          return c;
        }),
      );
    for (const tag of ["colorgroup", "m:colorgroup"])
      for (const cg of Array.from(d.getElementsByTagName(tag)))
        map.set(cg.getAttribute("id")!, Array.from(cg.getElementsByTagName(tag.replace("colorgroup", "color"))).map((c) => normColor(c.getAttribute("color"))));
    return map;
  };

  // Przypisanie filamentów (extruder) z konfiguracji slicerów.
  const bambuObj = new Map<string, number>();
  const objName = new Map<string, string>();
  const bambuPart = new Map<string, number>(); // klucz: "obiekt/część"
  const bambu = read("Metadata/model_settings.config");
  if (bambu) {
    const d = parseXml(bambu);
    for (const o of Array.from(d.getElementsByTagName("object"))) {
      const id = o.getAttribute("id")!;
      for (const md of Array.from(o.children)) {
        if (md.tagName !== "metadata") continue;
        if (md.getAttribute("key") === "extruder") bambuObj.set(id, +md.getAttribute("value")!);
        if (md.getAttribute("key") === "name" && md.getAttribute("value")) objName.set(id, md.getAttribute("value")!);
      }
      for (const p of Array.from(o.getElementsByTagName("part"))) {
        const e = Array.from(p.getElementsByTagName("metadata")).find((m) => m.getAttribute("key") === "extruder");
        if (e) bambuPart.set(`${id}/${p.getAttribute("id")}`, +e.getAttribute("value")!);
      }
    }
  }
  const prusaObj = new Map<string, number>();
  const prusaVol = new Map<string, { first: number; last: number; extruder?: number }[]>();
  const prusa = read("Metadata/Slic3r_PE_model.config");
  if (prusa) {
    const d = parseXml(prusa);
    for (const o of Array.from(d.getElementsByTagName("object"))) {
      const id = o.getAttribute("id")!;
      for (const md of Array.from(o.children))
        if (md.tagName === "metadata" && md.getAttribute("key") === "extruder") prusaObj.set(id, +md.getAttribute("value")!);
      prusaVol.set(
        id,
        Array.from(o.getElementsByTagName("volume")).map((v) => {
          const e = Array.from(v.getElementsByTagName("metadata")).find((m) => m.getAttribute("key") === "extruder");
          return { first: +v.getAttribute("firstid")!, last: +v.getAttribute("lastid")!, extruder: e ? +e.getAttribute("value")! || undefined : undefined };
        }),
      );
    }
  }

  // Kolory slotów filamentu.
  let slotColors: string[] = [];
  const proj = read("Metadata/project_settings.config");
  if (proj) {
    try {
      const j = JSON.parse(proj);
      const c = j.filament_colour ?? j.filament_color;
      if (Array.isArray(c)) slotColors = c.map(normColor);
    } catch {
      /* nie JSON – pomijamy */
    }
  }
  if (!slotColors.length) {
    const pe = read("Metadata/Slic3r_PE.config");
    const m = pe && (/^;\s*extruder_colour\s*=\s*(.+)$/m.exec(pe) ?? /^;\s*filament_colour\s*=\s*(.+)$/m.exec(pe));
    if (m) slotColors = m[1].split(";").map((s) => normColor(s.trim()));
  }

  // Zbieranie trójkątów.
  const chunks: Float32Array[] = [];
  const keys: string[] = []; // klucz grupy każdego trójkąta (kolejno)
  const objOfTri: number[] = [];
  const itemOfTri: number[] = [];
  const itemNames: string[] = [];
  const objectBaseKeys: string[] = [];
  let total = 0;
  const instanceKeys = new Map<string, number>();
  const objectId = (k: string, baseKey: string) => {
    let i = instanceKeys.get(k);
    if (i === undefined) {
      i = objectBaseKeys.push(baseKey) - 1;
      instanceKeys.set(k, i);
    }
    return i;
  };

  type Ctx = { path: string; m: Mat; rootId: string; partId?: string; inst: string; item: number };
  const visit = (o: Element, ctx: Ctx, depth: number) => {
    if (depth > 16) return;
    const mesh = o.getElementsByTagName("mesh")[0];
    if (mesh) return emitMesh(o, mesh, ctx);
    const comps = o.getElementsByTagName("component");
    for (let ci = 0; ci < comps.length; ci++) {
      const c = comps[ci];
      const path = (c.getAttribute("p:path") ?? ctx.path).replace(/^\//, "");
      const child = objectsOf(path).get(c.getAttribute("objectid")!);
      if (!child) continue;
      visit(child, { path, m: mul(parseMat(c.getAttribute("transform")), ctx.m), rootId: ctx.rootId, partId: c.getAttribute("objectid")!, inst: `${ctx.inst}/${ci}`, item: ctx.item }, depth + 1);
    }
  };

  const emitMesh = (o: Element, mesh: Element, ctx: Ctx) => {
    const d = doc(ctx.path);
    const mats = materialColors(d);
    const vs = mesh.getElementsByTagName("vertex");
    const v = new Float64Array(vs.length * 3);
    for (let i = 0; i < vs.length; i++) {
      v[i * 3] = +vs[i].getAttribute("x")!;
      v[i * 3 + 1] = +vs[i].getAttribute("y")!;
      v[i * 3 + 2] = +vs[i].getAttribute("z")!;
    }
    const ts = mesh.getElementsByTagName("triangle");
    const out = new Float32Array(ts.length * 9);
    const m = ctx.m;

    const objExtruder =
      (ctx.partId ? bambuPart.get(`${ctx.rootId}/${ctx.partId}`) : undefined) ?? bambuObj.get(ctx.rootId) ?? prusaObj.get(ctx.rootId);
    const volumes = prusaVol.get(ctx.rootId);
    const objPid = o.getAttribute("pid");
    const objP = o.getAttribute("pindex");

    for (let t = 0; t < ts.length; t++) {
      const tri = ts[t];
      const ids = [+tri.getAttribute("v1")!, +tri.getAttribute("v2")!, +tri.getAttribute("v3")!];
      for (let k = 0; k < 3; k++) {
        const x = v[ids[k] * 3], y = v[ids[k] * 3 + 1], z = v[ids[k] * 3 + 2];
        out[t * 9 + k * 3] = (x * m[0] + y * m[3] + z * m[6] + m[9]) * unit;
        out[t * 9 + k * 3 + 1] = (x * m[1] + y * m[4] + z * m[7] + m[10]) * unit;
        out[t * 9 + k * 3 + 2] = (x * m[2] + y * m[5] + z * m[8] + m[11]) * unit;
      }
      // Filament części / woluminu (PrusaSlicer trzyma kilka woluminów w jednej siatce).
      let vol = -1;
      let base = objExtruder;
      if (volumes?.length) {
        vol = volumes.findIndex((r) => t >= r.first && t <= r.last);
        if (vol >= 0 && volumes[vol].extruder) base = volumes[vol].extruder;
      }
      const baseKey = base ? `e:${base}` : materialKey(mats, objPid, objP) ?? "d";
      // Malowanie ma pierwszeństwo.
      const paint = tri.getAttribute("paint_color") ?? tri.getAttribute("slic3rpe:mmu_segmentation");
      const state = paint ? dominantPaintState(paint) : 0;
      let key: string;
      if (state > 0) key = `e:${state}`;
      else if (base) key = `e:${base}`;
      else key = materialKey(mats, tri.getAttribute("pid") ?? objPid, tri.getAttribute("p1") ?? objP) ?? baseKey;
      keys.push(key);
      objOfTri.push(objectId(`${ctx.inst}#${vol}`, baseKey));
      itemOfTri.push(ctx.item);
    }
    chunks.push(out);
    total += out.length;
  };

  const build = root.getElementsByTagName("build")[0];
  const rootObjects = objectsOf(rootPath);
  const buildItems = build ? Array.from(build.getElementsByTagName("item")) : [];
  if (buildItems.length) {
    buildItems.forEach((it, i) => {
      const o = rootObjects.get(it.getAttribute("objectid")!);
      const path = (it.getAttribute("p:path") ?? rootPath).replace(/^\//, "");
      const obj = path === rootPath ? o : objectsOf(path).get(it.getAttribute("objectid")!);
      if (!obj) return;
      const id = it.getAttribute("objectid")!;
      const item = itemNames.push(objName.get(id) ?? obj.getAttribute("name") ?? `Część ${itemNames.length + 1}`) - 1;
      visit(obj, { path, m: parseMat(it.getAttribute("transform")), rootId: id, inst: `${i}`, item }, 0);
    });
  } else {
    let i = 0;
    for (const [id, o] of rootObjects) {
      const item = itemNames.push(objName.get(id) ?? o.getAttribute("name") ?? `Część ${itemNames.length + 1}`) - 1;
      visit(o, { path: rootPath, m: IDENTITY, rootId: id, inst: `${i++}`, item }, 0);
    }
  }

  const positions = new Float32Array(total);
  let off = 0;
  for (const c of chunks) {
    positions.set(c, off);
    off += c.length;
  }

  // Klucze → grupy. Sloty filamentu sortowane po numerze, potem kolory materiałów.
  const uniq = Array.from(new Set([...keys, ...objectBaseKeys])).sort((a, b) => sortKey(a) - sortKey(b) || a.localeCompare(b));
  // Domyślna grupa „d” łączy się ze slotem 1, jeśli projekt używa slotów.
  const hasSlots = uniq.some((k) => k.startsWith("e:"));
  const canon = (k: string) => (k === "d" && hasSlots ? "e:1" : k);
  const used = Array.from(new Set(uniq.map(canon))).filter((k) => keys.some((x) => canon(x) === k) || objectBaseKeys.some((x) => canon(x) === k));
  const index = new Map(used.map((k, i) => [k, i]));
  const groups = used.map((k) => {
    if (k.startsWith("e:")) {
      const n = +k.slice(2);
      return { label: `Filament ${n}`, color: slotColors[n - 1] };
    }
    if (k.startsWith("c:")) return { label: colorNames.get(k.slice(2)) ?? k.slice(2).toUpperCase(), color: k.slice(2) };
    return {};
  });
  const group = new Uint8Array(keys.length);
  keys.forEach((k, i) => (group[i] = Math.min(255, index.get(canon(k))!)));
  const object = new Uint16Array(objOfTri.length);
  objOfTri.forEach((o, i) => (object[i] = Math.min(65535, o)));
  const item = Uint16Array.from(itemOfTri, (v) => Math.min(65535, v));
  // Nazwy powtarzających się kopii: „Kostka”, „Kostka (2)”…
  const seen = new Map<string, number>();
  const items = itemNames.map((n) => {
    const k = (seen.get(n) ?? 0) + 1;
    seen.set(n, k);
    return { name: k > 1 ? `${n} (${k})` : n };
  });
  return { positions, group, object, objectBase: objectBaseKeys.map((k) => index.get(canon(k)) ?? 0), groups, item, items };
}

function sortKey(k: string) {
  return k.startsWith("e:") ? +k.slice(2) : k === "d" ? 0 : 1000;
}

function materialKey(mats: Map<string, string[]>, pid: string | null, p: string | null) {
  if (!pid) return null;
  const list = mats.get(pid);
  const c = list?.[p ? +p : 0];
  return c ? `c:${c}` : null;
}

function normColor(c: string | null | undefined) {
  if (!c) return "";
  const m = /^#?([0-9a-f]{6})/i.exec(c.trim());
  return m ? `#${m[1].toLowerCase()}` : "";
}

function parseMat(s: string | null): Mat {
  if (!s) return IDENTITY;
  const v = s.trim().split(/\s+/).map(Number);
  return v.length === 12 && v.every(Number.isFinite) ? v : IDENTITY;
}

/** Złożenie: najpierw a, potem b. */
function mul(a: Mat, b: Mat): Mat {
  const r = new Array(12);
  for (let i = 0; i < 4; i++) {
    const x = a[i * 3], y = a[i * 3 + 1], z = a[i * 3 + 2];
    const w = i === 3 ? 1 : 0;
    for (let j = 0; j < 3; j++) r[i * 3 + j] = x * b[j] + y * b[3 + j] + z * b[6 + j] + w * b[9 + j];
  }
  return r;
}

/**
 * Malowanie kolorów (format TriangleSelector z PrusaSlicera, używany też przez Bambu/Orca):
 * ciąg szesnastkowy czytany od końca; każda cyfra to węzeł drzewa podziału trójkąta.
 * Bity 0–1: liczba podzielonych boków (0 = liść). W liściu bity 2–3 to stan (3 = rozszerzony,
 * kolejna cyfra + 3). Zwracamy stan o największym (przybliżonym) udziale w polu trójkąta.
 */
export function dominantPaintState(s: string): number {
  let i = s.length - 1;
  const weights = new Map<number, number>();
  const next = () => (i >= 0 ? parseInt(s[i--], 16) || 0 : 0);
  const node = (w: number, depth: number) => {
    if (i < 0 || depth > 24) return;
    const code = next();
    const split = code & 3;
    if (split === 0) {
      let state = code >> 2;
      if (state === 3) state = next() + 3;
      weights.set(state, (weights.get(state) ?? 0) + w);
    } else {
      const children = split + 1;
      for (let c = 0; c < children; c++) node(w / children, depth + 1);
    }
  };
  node(1, 0);
  let best = 0, bw = -1;
  for (const [st, w] of weights) if (w > bw) (best = st), (bw = w);
  return best;
}
