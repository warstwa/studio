"use client";
import { useCallback, useEffect, useState } from "react";

type Img = { url: string; name?: string };

/** Miniatury z powiększeniem (lightbox): strzałki, Esc, kliknięcie w tło. */
export default function Gallery({ images, variant = "grid", alt = "" }: { images: Img[]; variant?: "grid" | "strip" | "hero"; alt?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const n = images.length;
  const go = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + n) % n)), [n]);
  useEffect(() => {
    if (open === null) return;
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", on);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", on);
      document.body.style.overflow = "";
    };
  }, [open, go]);
  if (!n) return null;
  return (
    <>
      <div className={`gallery ${variant}`}>
        {images.map((im, i) => (
          <button key={im.url + i} type="button" className="gallery-item" onClick={() => setOpen(i)} aria-label={`Powiększ zdjęcie ${i + 1}`} style={{ ["--i" as string]: i }}>
            <img src={im.url} alt={im.name ?? alt} loading="lazy" />
          </button>
        ))}
      </div>
      {open !== null && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Podgląd zdjęcia" onClick={() => setOpen(null)}>
          <img src={images[open].url} alt={images[open].name ?? alt} onClick={(e) => e.stopPropagation()} />
          {n > 1 && (
            <>
              <button type="button" className="lb-nav prev" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Poprzednie">‹</button>
              <button type="button" className="lb-nav next" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Następne">›</button>
            </>
          )}
          <button type="button" className="lb-close" onClick={() => setOpen(null)} aria-label="Zamknij">×</button>
          <span className="lb-count mono">{open + 1} / {n}</span>
        </div>
      )}
    </>
  );
}
