import Link from "next/link";
import { LEGAL_UPDATED, OPERATOR } from "@/lib/legal";

/** Wspólny układ dokumentów prawnych: nagłówek, spis treści, treść. */
export default function LegalDoc({
  title,
  lead,
  toc,
  children,
}: {
  title: string;
  lead: string;
  toc: { id: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="page">
      <div className="wrap">
        <div className="page-head">
          <div>
            <div className="crumbs mono">Dokumenty / <span>{title}</span></div>
            <h1>{title}</h1>
            <p>{lead}</p>
          </div>
          <span className="mono dim">Obowiązuje od {new Date(LEGAL_UPDATED + "T12:00").toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}</span>
        </div>
        {!OPERATOR.complete && (
          <div className="banner warn" style={{ marginBottom: 24 }}>
            Wersja robocza — dane operatora serwisu nie zostały jeszcze uzupełnione. Dokument wymaga weryfikacji prawnej przed publicznym startem.
          </div>
        )}
        <div className="legal-layout">
          <nav className="legal-toc" aria-label="Spis treści">
            <span className="label">Spis treści</span>
            <ol>
              {toc.map((t) => (
                <li key={t.id}><a href={`#${t.id}`}>{t.label}</a></li>
              ))}
            </ol>
            <div className="legal-other">
              <Link href="/regulamin">Regulamin</Link>
              <Link href="/polityka-prywatnosci">Polityka prywatności</Link>
            </div>
          </nav>
          <article className="legal">{children}</article>
        </div>
      </div>
    </div>
  );
}
