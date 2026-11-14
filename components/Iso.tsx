/**
 * Izometryczne ilustracje kreskowe (SVG, bez JS po stronie klienta).
 * Rzut: x → prawo-dół, y → lewo-dół, z → góra. Ściany wypełnione kolorem tła,
 * więc rysowanie od tyłu do przodu zasłania niewidoczne krawędzie.
 */
import type { ReactNode } from "react";

const C = Math.cos(Math.PI / 6);
const S = 0.5;
type P = [number, number];

class Scene {
  u: number;
  items: ReactNode[] = [];
  pts: P[] = [];
  k = 0;
  constructor(unit: number) {
    this.u = unit;
  }
  p(x: number, y: number, z: number): P {
    const q: P = [(x - y) * C * this.u, ((x + y) * S - z) * this.u];
    this.pts.push(q);
    return q;
  }
  key() {
    return `i${this.k++}`;
  }
  poly(pts: P[], cls: string, extra: Record<string, unknown> = {}) {
    return <polygon key={this.key()} points={pts.map((q) => q.map((v) => v.toFixed(1)).join(",")).join(" ")} className={cls} {...extra} />;
  }
  /** Prostopadłościan — zwraca grupę (do animacji można ją owinąć). */
  box(x: number, y: number, z: number, w: number, d: number, h: number, tone: "" | "acc" | "soft" = "", deco?: (s: Scene) => ReactNode[]) {
    const t = [this.p(x, y, z + h), this.p(x + w, y, z + h), this.p(x + w, y + d, z + h), this.p(x, y + d, z + h)];
    const r = [this.p(x + w, y, z), this.p(x + w, y + d, z), this.p(x + w, y + d, z + h), this.p(x + w, y, z + h)];
    const l = [this.p(x, y + d, z), this.p(x + w, y + d, z), this.p(x + w, y + d, z + h), this.p(x, y + d, z + h)];
    return (
      <g key={this.key()} className={`iso-box ${tone}`}>
        {this.poly(l, "f-l")}
        {this.poly(r, "f-r")}
        {this.poly(t, "f-t")}
        {deco?.(this)}
      </g>
    );
  }
  line(a: P, b: P, cls = "ln") {
    return <line key={this.key()} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className={cls} />;
  }
  /** Okrąg leżący w płaszczyźnie XY (rzutowany na elipsę). */
  disc(x: number, y: number, z: number, r: number, cls = "ln") {
    const [cx, cy] = this.p(x, y, z);
    this.p(x + r, y + r, z);
    this.p(x - r, y - r, z);
    return <ellipse key={this.key()} cx={cx} cy={cy} rx={r * Math.SQRT2 * C * this.u} ry={r * Math.SQRT2 * S * this.u} className={cls} />;
  }
  /** Podpis z linią odniesienia: punkt w scenie → etykieta przesunięta o (dx, dy) px. */
  callout(at: P, dx: number, dy: number, title: string, sub?: string) {
    const [x, y] = at;
    const tx = x + dx;
    const ty = y + dy;
    const right = dx >= 0;
    const w = Math.max(title.length, sub?.length ?? 0) * 7.4 + 6;
    this.pts.push([right ? tx + w : tx - w, ty - 14], [tx, ty + 16]);
    return (
      <g key={this.key()} className="iso-call">
        <polyline points={`${x},${y} ${x + dx * 0.55},${ty} ${tx},${ty}`} />
        <rect x={x - 2.5} y={y - 2.5} width="5" height="5" />
        <text x={right ? tx + 6 : tx - 6} y={ty - 4} textAnchor={right ? "start" : "end"} className="t1">
          {title}
        </text>
        {sub && (
          <text x={right ? tx + 6 : tx - 6} y={ty + 12} textAnchor={right ? "start" : "end"} className="t2">
            {sub}
          </text>
        )}
      </g>
    );
  }
  svg(children: ReactNode, label: string, pad = 14) {
    const xs = this.pts.map((q) => q[0]);
    const ys = this.pts.map((q) => q[1]);
    const x0 = Math.min(...xs) - pad;
    const y0 = Math.min(...ys) - pad;
    const w = Math.max(...xs) - x0 + pad;
    const h = Math.max(...ys) - y0 + pad;
    return (
      <svg className="iso" viewBox={`${x0.toFixed(0)} ${y0.toFixed(0)} ${w.toFixed(0)} ${h.toFixed(0)}`} role="img" aria-label={label}>
        {children}
      </svg>
    );
  }
}

/** Drukarka zamknięta: korpus, okno w drzwiach, wyświetlacz. */
function printer(s: Scene, x: number, y: number, active = false, delay = 0) {
  const w = 2.4,
    d = 2.4,
    h = 2.7;
  return s.box(x, y, 0, w, d, h, "", (s) => {
    // drzwi (ściana prawa, x = x + w)
    const m = 0.28;
    const win = [s.p(x + w, y + m, m + 0.2), s.p(x + w, y + d - m, m + 0.2), s.p(x + w, y + d - m, h - m), s.p(x + w, y + m, h - m)];
    const out: ReactNode[] = [s.poly(win, active ? "win on" : "win")];
    // wyświetlacz (ściana lewa)
    out.push(s.poly([s.p(x + 0.3, y + d, h - 0.45), s.p(x + 0.9, y + d, h - 0.45), s.p(x + 0.9, y + d, h - 0.8), s.p(x + 0.3, y + d, h - 0.8)], "f-in"));
    if (active) {
      // narastające warstwy wydruku
      for (let i = 0; i < 6; i++) {
        const z = m + 0.32 + i * 0.16;
        const a = s.p(x + w, y + 0.85, z);
        const b = s.p(x + w, y + d - 0.85, z);
        out.push(
          <line key={s.key()} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className="layer">
            <animate attributeName="opacity" values="0;0;1;1;0" keyTimes={`0;${(i / 8).toFixed(2)};${((i + 1) / 8).toFixed(2)};0.92;1`} dur="6s" begin={`${delay}s`} repeatCount="indefinite" />
          </line>,
        );
      }
    }
    return out;
  });
}

export function IsoFarm() {
  const s = new Scene(26);
  const els: ReactNode[] = [];
  els.push(s.box(-0.6, -0.6, -0.5, 10.6, 7.2, 0.5, "soft"));
  const spots: [number, number, boolean][] = [];
  for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) spots.push([0.3 + i * 3.3, 0.4 + j * 3.4, (i === 1 && j === 0) || (i === 2 && j === 1)]);
  spots.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  spots.forEach(([x, y, on], n) => els.push(printer(s, x, y, on, n * 0.7)));
  // portal: dwie szyny wzdłuż X + belka poprzeczna jeżdżąca po nich
  els.push(s.box(-0.4, -0.3, 3.5, 10.2, 0.18, 0.18, "acc"));
  els.push(s.box(-0.4, 6.3, 3.5, 10.2, 0.18, 0.18, "acc"));
  const a = s.p(0, 0, 0);
  const b = s.p(7.2, 0, 0);
  els.push(
    <g key="gantry">
      <animateTransform attributeName="transform" type="translate" values={`0 0;${b[0] - a[0]} ${b[1] - a[1]};0 0`} dur="9s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" />
      {s.box(0.4, -0.5, 3.68, 0.5, 7.2, 0.3, "acc")}
      {s.box(0.45, 2.8, 3.1, 0.4, 0.5, 0.58, "acc")}
      {s.line(s.p(0.65, 3.05, 3.1), s.p(0.65, 3.05, 2.75), "ln acc-ln dash")}
    </g>,
  );
  els.push(s.callout(s.p(0.65, -0.4, 3.98), -40, -34, "PORTAL / DOPASOWANIE", "materiał · pole · termin"));
  els.push(s.callout(s.p(6.9, 0.4 + 1.2, 1.6), 60, -40, "ZLECENIE W DRUKU", "84 warstwy · PETG"));
  els.push(s.callout(s.p(0.3 + 1.2, 3.8 + 2.4, 1.4), -70, 34, "DRUKARZE W OKOLICY", "oferta: cena + termin"));
  els.push(s.callout(s.p(9.6, 3.8 + 1.2, 1.2), 46, 30, "DRUGI DRUKARZ", "pomaga przy serii"));
  return s.svg(<>{els}</>, "Izometryczna farma drukarek z portalem dopasowania");
}

export function IsoHotend() {
  const s = new Scene(30);
  const els: ReactNode[] = [];
  // stół z wydrukiem
  els.push(s.box(-3.4, -3.4, -1.5, 6.8, 6.8, 0.22, "soft"));
  els.push(s.box(-0.9, -0.9, -1.28, 1.8, 1.8, 0.5, "acc"));
  els.push(s.line(s.p(0, 0, -0.78), s.p(0, 0, 9.4), "ln dash axis"));
  const part = (z: number, node: ReactNode, i: number) => (
    <g key={`p${i}`}>
      <animateTransform attributeName="transform" type="translate" values="0 0;0 -5;0 0" dur="4.8s" begin={`${i * 0.35}s`} repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" />
      {node}
    </g>
  );
  // dysza
  const tip = s.p(0, 0, 0.15);
  els.push(
    part(
      0,
      <>
        {s.poly([s.p(-0.36, 0.36, 0.6), s.p(0.36, 0.36, 0.6), tip], "f-l")}
        {s.poly([s.p(0.36, -0.36, 0.6), s.p(0.36, 0.36, 0.6), tip], "f-r")}
        {s.box(-0.36, -0.36, 0.6, 0.72, 0.72, 0.5)}
      </>,
      0,
    ),
  );
  // blok grzejny
  els.push(part(0, <g className="heat">{s.box(-1.1, -0.75, 1.75, 2.2, 1.5, 1)}</g>, 1));
  // heatbreak
  els.push(part(0, s.box(-0.22, -0.22, 3.3, 0.44, 0.44, 1.2), 2));
  // radiator — żebra
  const fins: ReactNode[] = [];
  for (let i = 0; i < 9; i++) fins.push(s.box(-1.25, -1.25, 4.9 + i * 0.26, 2.5, 2.5, 0.09));
  els.push(part(0, <>{fins}</>, 3));
  // wentylator
  els.push(
    part(
      0,
      <>
        {s.box(-1.5, -1.5, 8, 3, 3, 0.7)}
        {s.disc(0, 0, 8.7, 1.25)}
        {s.disc(0, 0, 8.7, 0.35, "ln acc-ln")}
      </>,
      4,
    ),
  );
  els.push(s.callout(s.p(1.5, 1.5, 8.35), 70, -10, "WENTYLATOR", "chłodzenie warstwy"));
  els.push(s.callout(s.p(-1.25, 1.25, 5.8), -64, 4, "RADIATOR", "9 żeber"));
  els.push(s.callout(s.p(1.1, 0.75, 2.25), 92, 10, "BLOK GRZEJNY", "190–300 °C"));
  els.push(s.callout(s.p(-0.36, 0.36, 0.85), -78, 28, "DYSZA", "0.2 – 0.8 mm"));
  els.push(s.callout(s.p(3.4, 3.4, -1.4), 30, 34, "STÓŁ / PEI", "pierwsza warstwa"));
  return s.svg(<>{els}</>, "Rozłożona głowica drukarki 3D");
}

export function IsoSplit() {
  const s = new Scene(24);
  const els: ReactNode[] = [];
  els.push(s.box(-0.8, -0.6, -0.4, 14.6, 10.2, 0.4, "soft"));
  // tory: wspólny odcinek, rozgałęzienie, trzy wjazdy do drukarek
  const ys = [0.6, 3.6, 6.6];
  const track = (pts: [number, number][]) => {
    const out: ReactNode[] = [];
    for (let i = 1; i < pts.length; i++) out.push(s.line(s.p(pts[i - 1][0], pts[i - 1][1], 0.02), s.p(pts[i][0], pts[i][1], 0.02), "ln track"));
    return out;
  };
  const paths = ys.map((y) => [[2.6, 3.6] as [number, number], [5, 3.6] as [number, number], [5.6, y + 1.2] as [number, number], [10.6, y + 1.2] as [number, number]]);
  paths.forEach((p) => els.push(...track(p)));
  // zamówienie
  els.push(
    s.box(0, 2.5, 0, 2.2, 2.2, 2.2, "acc", (s) => [
      s.line(s.p(0, 3.6, 2.2), s.p(2.2, 3.6, 2.2), "ln acc-ln"),
      s.line(s.p(1.1, 2.5, 2.2), s.p(1.1, 4.7, 2.2), "ln acc-ln"),
    ]),
  );
  // drukarki docelowe (od tyłu)
  ys.forEach((y, i) => els.push(printer(s, 10.8, y, true, i * 1.3)));
  // części jadące po torach
  paths.forEach((p, i) => {
    const d = p.map(([x, y], k) => {
      const q = s.p(x, y, 0.02);
      return `${k ? "L" : "M"}${q[0].toFixed(1)},${q[1].toFixed(1)}`;
    });
    for (let n = 0; n < 2; n++) {
      els.push(
        <g key={s.key()}>
          <animateMotion path={d.join(" ")} dur="5.4s" begin={`${i * 0.6 + n * 2.7}s`} repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.9;1" dur="5.4s" begin={`${i * 0.6 + n * 2.7}s`} repeatCount="indefinite" />
          {(() => {
            const sub = new Scene(24);
            const g = sub.box(-0.25, -0.25, 0, 0.5, 0.5, 0.45, "acc");
            return g;
          })()}
        </g>,
      );
    }
  });
  els.push(s.callout(s.p(0, 4.7, 1.8), -40, 30, "ZAMÓWIENIE", "120 szt. · PETG"));
  els.push(s.callout(s.p(13.2, ys[0] + 0.6, 2.6), 40, -30, "DRUKARZ A", "60 szt. · główny"));
  els.push(s.callout(s.p(13.2, ys[1] + 1.2, 1.4), 50, 2, "DRUKARZ B", "40 szt. · wysyła sam"));
  els.push(s.callout(s.p(10.8 + 1.2, ys[2] + 2.4, 1), -30, 40, "DRUKARZ C", "20 szt. · wysyła sam"));
  els.push(s.callout(s.p(5.3, 3.6, 0.1), 10, -62, "PODZIAŁ PRZY AKCEPTACJI", "Ty decydujesz o ilościach"));
  return s.svg(<>{els}</>, "Zamówienie dzielone na trzech drukarzy");
}
