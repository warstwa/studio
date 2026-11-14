"use client";
import { useEffect, useRef } from "react";

const GLYPHS = "░▒▓/\\#+=_-<>01";

/** Tekst „przemiatany” znakami, gdy wjedzie w viewport (i po najechaniu). */
export default function Scramble({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const run = () => {
      cancelAnimationFrame(raf);
      const t0 = performance.now();
      const dur = 260 + text.length * 22;
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / dur);
        const solid = Math.floor(p * text.length);
        let out = text.slice(0, solid);
        for (let i = solid; i < Math.min(text.length, solid + 6); i++)
          out += text[i] === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        el.textContent = out;
        if (p < 1) raf = requestAnimationFrame(tick);
        else el.textContent = text;
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          io.disconnect();
          run();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    const host = el.closest(".sbar, .alink") as HTMLElement | null;
    host?.addEventListener("mouseenter", run);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      host?.removeEventListener("mouseenter", run);
    };
  }, [text]);
  return (
    <span ref={ref} className={className} aria-label={text}>
      {text}
    </span>
  );
}
