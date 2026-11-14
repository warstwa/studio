"use client";
import { useEffect, useRef } from "react";

/**
 * Animacja wydruku warstwa po warstwie w rzucie izometrycznym.
 * Ukończone warstwy są cache'owane na osobnym płótnie, więc w każdej klatce
 * rysujemy tylko ostatnie (stygnące) warstwy, aktualną ścieżkę i głowicę.
 */

type Shape = { name: string; file: string; mat: string; temp: number; r: (a: number, t: number) => number };

const SHAPES: Shape[] = [
  {
    name: "Wazon skręcony",
    file: "vase_twist_v3.gcode",
    mat: "PLA · Grafit",
    temp: 215,
    r: (a, t) => {
      const prof = 0.62 + 0.28 * Math.sin(t * Math.PI * 1.15 + 0.2) - 0.12 * t;
      const n = 6;
      const tw = a + t * 1.6;
      const poly = Math.cos(Math.PI / n) / Math.cos(((tw % ((2 * Math.PI) / n)) + (2 * Math.PI) / n) % ((2 * Math.PI) / n) - Math.PI / n);
      return prof * (0.86 + 0.14 * poly);
    },
  },
  {
    name: "Lampa żebrowana",
    file: "lamp_ribbed.gcode",
    mat: "PETG · Mleczny",
    temp: 240,
    r: (a, t) => {
      const prof = 0.48 + 0.4 * Math.sin(t * Math.PI) ** 0.8;
      return prof * (1 + 0.055 * Math.sin(a * 18));
    },
  },
  {
    name: "Doniczka pięciolistna",
    file: "planter_5lobe.gcode",
    mat: "PLA · Terakota",
    temp: 210,
    r: (a, t) => {
      const prof = 0.5 + 0.38 * t - 0.12 * t * t;
      return prof * (0.84 + 0.16 * Math.cos(5 * (a - t * 0.9)));
    },
  },
];

const PTS = 150;
const LAYERS = 84;
const HOT = 7; // ile ostatnich warstw rysujemy "na gorąco"

export default function HeroPrint() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hud = {
    layer: useRef<HTMLSpanElement>(null),
    z: useRef<HTMLSpanElement>(null),
    temp: useRef<HTMLSpanElement>(null),
    file: useRef<HTMLSpanElement>(null),
    mat: useRef<HTMLSpanElement>(null),
    pct: useRef<HTMLSpanElement>(null),
    bar: useRef<HTMLElement>(null),
    xy: useRef<HTMLSpanElement>(null),
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const cache = document.createElement("canvas");
    const cctx = cache.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0, H = 0, dpr = 1, scale = 1, cx = 0, baseY = 0, layerH = 1;
    let shapeIdx = 0;
    let layers: { x: number; y: number; a: number }[][] = [];
    let layer = 0, pt = 0, cachedUpTo = 0;
    let phase: "print" | "hold" | "fade" = "print";
    let phaseT = 0, fade = 1, raf = 0, visible = true, last = performance.now(), hudT = 0;

    const iso = (x: number, y: number, z: number) => ({
      x: cx + (x - y) * 0.866 * scale,
      y: baseY + (x + y) * 0.5 * scale - z * layerH,
    });

    function build() {
      const s = SHAPES[shapeIdx];
      layers = [];
      for (let l = 0; l < LAYERS; l++) {
        const t = l / (LAYERS - 1);
        const ring = [];
        for (let i = 0; i <= PTS; i++) {
          const a = (i / PTS) * Math.PI * 2;
          const r = s.r(a, t);
          ring.push({ ...iso(Math.cos(a) * r, Math.sin(a) * r, l), a });
        }
        layers.push(ring);
      }
      layer = 0;
      pt = 0;
      cachedUpTo = 0;
      cctx.setTransform(1, 0, 0, 1, 0, 0);
      cctx.clearRect(0, 0, cache.width, cache.height);
      cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (hud.file.current) hud.file.current.textContent = s.file;
      if (hud.mat.current) hud.mat.current.textContent = s.mat;
    }

    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width;
      H = r.height;
      canvas.width = cache.width = Math.round(W * dpr);
      canvas.height = cache.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scale = Math.min(W, H) * 0.27;
      cx = W / 2;
      baseY = H * 0.6;
      layerH = (H * 0.36) / LAYERS;
      const keep = { layer, pt };
      build();
      if (phase !== "print" || reduce) {
        layer = LAYERS;
      } else {
        layer = keep.layer;
        pt = keep.pt;
      }
    }

    function shade(a: number) {
      // przód obiektu (kierunek do widza ≈ 45°) jaśniejszy
      return 0.22 + 0.78 * Math.max(0, Math.cos(a - Math.PI / 4)) ** 1.3;
    }

    function strokeRing(c: CanvasRenderingContext2D, ring: { x: number; y: number; a: number }[], upto: number, color: (b: number) => string, width = 1) {
      c.lineWidth = width;
      c.lineCap = "round";
      // grupujemy segmenty w kubełki jasności, żeby ograniczyć liczbę stroke()
      const buckets = 6;
      for (let b = 0; b < buckets; b++) {
        c.beginPath();
        let any = false;
        for (let i = 1; i <= upto && i < ring.length; i++) {
          const s = shade((ring[i].a + ring[i - 1].a) / 2);
          if (Math.min(buckets - 1, Math.floor(s * buckets)) !== b) continue;
          c.moveTo(ring[i - 1].x, ring[i - 1].y);
          c.lineTo(ring[i].x, ring[i].y);
          any = true;
        }
        if (any) {
          c.strokeStyle = color((b + 0.5) / buckets);
          c.stroke();
        }
      }
    }

    const cool = (b: number) => `rgba(236,235,230,${0.08 + b * 0.62})`;

    function hatchFirstLayer() {
      // wypełnienie pierwszej warstwy — ukośne linie przycięte do obrysu
      const ring = layers[0];
      cctx.save();
      cctx.beginPath();
      ring.forEach((p, i) => (i ? cctx.lineTo(p.x, p.y) : cctx.moveTo(p.x, p.y)));
      cctx.closePath();
      cctx.clip();
      cctx.strokeStyle = "rgba(236,235,230,0.10)";
      cctx.lineWidth = 1;
      cctx.beginPath();
      for (let k = -W; k < W; k += 5) {
        cctx.moveTo(cx + k, baseY - scale);
        cctx.lineTo(cx + k + scale * 2, baseY + scale);
      }
      cctx.stroke();
      cctx.restore();
    }

    function drawPlate() {
      ctx.save();
      ctx.lineWidth = 1;
      const n = 10;
      const s = 1.25;
      for (let i = -n; i <= n; i++) {
        const t = i / n;
        const a = iso(t * s, -s, 0), b = iso(t * s, s, 0);
        const c = iso(-s, t * s, 0), d = iso(s, t * s, 0);
        ctx.strokeStyle = i === 0 ? "rgba(47,209,106,0.18)" : "rgba(255,255,255,0.045)";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(d.x, d.y);
        ctx.stroke();
      }
      // krawędź stołu
      const p = [iso(-s, -s, 0), iso(s, -s, 0), iso(s, s, 0), iso(-s, s, 0)];
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath();
      p.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
      ctx.closePath();
      ctx.stroke();
      const g = ctx.createLinearGradient(0, p[2].y, 0, p[2].y + 10);
      g.addColorStop(0, "rgba(255,255,255,0.06)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(p[3].x, p[3].y);
      ctx.lineTo(p[2].x, p[2].y);
      ctx.lineTo(p[1].x, p[1].y);
      ctx.lineTo(p[1].x, p[1].y + 8);
      ctx.lineTo(p[2].x, p[2].y + 8);
      ctx.lineTo(p[3].x, p[3].y + 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawNozzle(x: number, y: number, tSec: number) {
      // oś X portalu
      ctx.save();
      const railY = y - 34;
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - W, railY + W * 0.577);
      ctx.lineTo(x + W, railY - W * 0.577);
      ctx.stroke();
      // poświata
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 26);
      glow.addColorStop(0, "rgba(80,224,130,0.55)");
      glow.addColorStop(1, "rgba(47,209,106,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 26, 0, Math.PI * 2);
      ctx.fill();
      // korpus głowicy
      ctx.fillStyle = "#1d1d20";
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.beginPath();
      ctx.rect(x - 13, y - 44, 26, 22);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2fd16a";
      ctx.fillRect(x - 13, y - 44, 3, 22);
      // radiator
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx.moveTo(x - 6, y - 40 + i * 5);
        ctx.lineTo(x + 10, y - 40 + i * 5);
      }
      ctx.stroke();
      // dysza
      ctx.fillStyle = "#c9a06a";
      ctx.beginPath();
      ctx.moveTo(x - 5, y - 22);
      ctx.lineTo(x + 5, y - 22);
      ctx.lineTo(x + 1.5, y - 2);
      ctx.lineTo(x - 1.5, y - 2);
      ctx.closePath();
      ctx.fill();
      // punkt topienia
      ctx.fillStyle = `rgba(255,${170 + Math.sin(tSec * 20) * 30},90,1)`;
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible) {
        last = now;
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const tSec = now / 1000;

      if (phase === "print") {
        // szybciej na niskich warstwach (duży obwód), stałe tempo w punktach
        pt += dt * 620;
        while (pt >= PTS && layer < LAYERS) {
          pt -= PTS;
          layer++;
        }
        if (layer >= LAYERS) {
          layer = LAYERS;
          pt = 0;
          phase = "hold";
          phaseT = 0;
        }
      } else if (phase === "hold") {
        phaseT += dt;
        if (phaseT > 2.4) {
          phase = "fade";
          phaseT = 0;
        }
      } else {
        phaseT += dt;
        fade = Math.max(0, 1 - phaseT / 0.7);
        if (phaseT > 0.9) {
          shapeIdx = (shapeIdx + 1) % SHAPES.length;
          build();
          phase = "print";
          fade = 1;
        }
      }

      // przenieś wystygnięte warstwy do cache
      const coolLimit = Math.max(0, layer - HOT);
      while (cachedUpTo < coolLimit) {
        strokeRing(cctx, layers[cachedUpTo], PTS, cool);
        if (cachedUpTo === 0) hatchFirstLayer();
        cachedUpTo++;
      }

      ctx.clearRect(0, 0, W, H);
      drawPlate();
      ctx.globalAlpha = fade;
      ctx.drawImage(cache, 0, 0, W, H);

      // gorące warstwy: pomarańcz → biel
      const top = Math.min(layer, LAYERS - 1);
      for (let l = cachedUpTo; l <= top; l++) {
        const ring = layers[l];
        if (!ring) continue;
        const upto = l === layer && phase === "print" ? Math.floor(pt) : PTS;
        const heat = 1 - (layer - l) / HOT; // 1 = najgorętsza
        strokeRing(ctx, ring, upto, (b) => {
          const r = 236 + (255 - 236) * heat;
          const g = 235 + (100 - 235) * heat;
          const bl = 230 + (40 - 230) * heat;
          return `rgba(${r | 0},${g | 0},${bl | 0},${0.12 + b * 0.75})`;
        }, l === layer ? 1.4 : 1);
      }
      ctx.globalAlpha = 1;

      if (phase === "print" && layer < LAYERS) {
        // osłona: po zmianie rozmiaru / przebudowie kształtu punkt może chwilowo nie istnieć
        const p = layers[layer]?.[Math.max(0, Math.min(PTS, Math.floor(pt) || 0))];
        if (p) drawNozzle(p.x, p.y, tSec);
      } else if (phase === "hold") {
        const p = layers[LAYERS - 1]?.[0];
        const lift = Math.min(1, phaseT * 1.5);
        if (p) drawNozzle(p.x + lift * 30, p.y - lift * 40, tSec);
      }

      hudT += dt;
      if (hudT > 0.08) {
        hudT = 0;
        const shown = Math.min(layer + 1, LAYERS);
        const pct = Math.min(100, ((layer + pt / PTS) / LAYERS) * 100);
        if (hud.layer.current) hud.layer.current.textContent = `${String(shown).padStart(3, "0")} / ${LAYERS}`;
        if (hud.z.current) hud.z.current.textContent = `${(shown * 0.2).toFixed(2)} mm`;
        if (hud.temp.current)
          hud.temp.current.textContent = `${(SHAPES[shapeIdx].temp + Math.sin(tSec * 1.7) * 0.8).toFixed(1)} °C`;
        if (hud.pct.current) hud.pct.current.textContent = phase === "print" ? `${pct.toFixed(0)}%` : "GOTOWE";
        if (hud.bar.current) hud.bar.current.style.width = `${phase === "print" ? pct : 100}%`;
        if (hud.xy.current && phase === "print" && layer < LAYERS) {
          const a = layers[layer][Math.floor(pt)]?.a ?? 0;
          const r = SHAPES[shapeIdx].r(a, layer / LAYERS) * 60;
          hud.xy.current.textContent = `X ${(128 + Math.cos(a) * r).toFixed(2)}  Y ${(128 + Math.sin(a) * r).toFixed(2)}`;
        }
      }
    }

    resize();
    if (reduce) {
      layer = LAYERS;
      phase = "hold";
      phaseT = -Infinity;
    }
    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="stage" aria-label="Animacja: drukarka 3D drukuje obiekt warstwa po warstwie" role="img">
      <canvas ref={canvasRef} />
      <span className="corner tl" />
      <span className="corner tr" />
      <span className="corner bl" />
      <span className="corner br" />
      <div className="hud mono">
        <div className="hud-row">
          <div className="hud-cell">
            <span className="k">Plik</span>
            <span className="v" ref={hud.file}>vase_twist_v3.gcode</span>
          </div>
          <div className="hud-cell" style={{ textAlign: "right" }}>
            <span className="k">Materiał</span>
            <span className="v" ref={hud.mat}>PLA · Grafit</span>
          </div>
        </div>
        <div>
          <div className="hud-row">
            <div className="hud-cell">
              <span className="k">Warstwa</span>
              <span className="v" ref={hud.layer}>001 / {LAYERS}</span>
            </div>
            <div className="hud-cell">
              <span className="k">Z</span>
              <span className="v" ref={hud.z}>0.20 mm</span>
            </div>
            <div className="hud-cell">
              <span className="k">Dysza</span>
              <span className="v" ref={hud.temp}>215.0 °C</span>
            </div>
            <div className="hud-cell" style={{ textAlign: "right" }}>
              <span className="k">Postęp</span>
              <span className="v accent" ref={hud.pct}>0%</span>
            </div>
          </div>
          <div className="hud-bar">
            <i ref={hud.bar} />
          </div>
          <div className="hud-row" style={{ marginTop: 8 }}>
            <span className="dim" ref={hud.xy}>X 128.00  Y 128.00</span>
            <span className="dim">0.4 mm · 0.20 mm</span>
          </div>
        </div>
      </div>
    </div>
  );
}
