import Link from "next/link";
import type { ReactNode } from "react";
import Scramble from "./Scramble";

/** Strzałka ↗ używana w linkach i przyciskach. */
export function Ne({ size = 11 }: { size?: number }) {
  return (
    <svg className="ne" width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M2.5 9.5l7-7M4 2.5h5.5V8" />
    </svg>
  );
}

/** Pasek nagłówka sekcji: ■ 01 // ZAMÓWIENIA   KLUCZ: WARTOŚĆ … */
export function SectionBar({ num, title, meta = [] }: { num: string; title: string; meta?: [string, string][] }) {
  return (
    <div className="sbar mono">
      <span className="sbar-sq" aria-hidden />
      <Scramble text={`${num} // ${title}`} className="sbar-title" />
      {meta.map(([k, v]) => (
        <span key={k} className="sbar-meta">
          <span className="dim">{k}:</span> {v}
        </span>
      ))}
    </div>
  );
}

/** Lista numerowana 01–03: etykieta w mono po lewej, opis po prawej. */
export function NumList({ items }: { items: { k: string; t: ReactNode }[] }) {
  return (
    <ol className="numlist">
      {items.map((it, i) => (
        <li key={it.k}>
          <span className="mono">
            <b>{String(i + 1).padStart(2, "0")}</b> {it.k}
          </span>
          <span>{it.t}</span>
        </li>
      ))}
    </ol>
  );
}

/** Link wersalikami z przerywanym podkreśleniem i strzałką ↗. */
export function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="alink">
      <span>{children}</span>
      <Ne size={13} />
    </Link>
  );
}

/** Panel z kropkowaną siatką i krzyżykami w rogach — tło ilustracji. */
export function Plate({ children, className = "", label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <div className={`plate ${className}`}>
      <span className="x tl" aria-hidden />
      <span className="x tr" aria-hidden />
      <span className="x bl" aria-hidden />
      <span className="x br" aria-hidden />
      {label && <span className="plate-label mono">{label}</span>}
      {children}
    </div>
  );
}
