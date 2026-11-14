import Link from "next/link";
import Logo from "./Logo";

const COLS: [string, [string, string][]][] = [
  ["Zamawiający", [["Złóż zamówienie", "/zamow"], ["Kalkulator", "/slicer"], ["Drukarze", "/drukarze"], ["Jak to działa", "/#jak-to-dziala"]]],
  ["Drukarze", [["Zostań drukarzem", "/rejestracja?rola=drukarz"], ["Giełda zleceń", "/zlecenia"], ["Panel", "/panel"], ["Profil", "/profil"]]],
  ["Serwis", [["Regulamin", "/regulamin"], ["Prywatność", "/polityka-prywatnosci"], ["Logowanie", "/logowanie"], ["Rejestracja", "/rejestracja"]]],
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-grid">
        <div className="footer-brand">
          <span className="logo">
            <Logo size={20} />
            WARSTWA
          </span>
          <p className="muted">
            Sieć drukarzy 3D.
            <br /> Od pliku do paczki.
          </p>
        </div>
        {COLS.map(([h, links]) => (
          <nav key={h} aria-label={h} className="footer-col">
            <span className="mono dim">{h}</span>
            {links.map(([t, href]) => (
              <Link key={href} href={href}>
                {t}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div className="footer-motif" aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <div className="wrap footer-base mono dim">
        <span>© {new Date().getFullYear()} Warstwa · Sieć drukarzy 3D</span>
        <span>
          <Link href="/regulamin">Regulamin</Link> · <Link href="/polityka-prywatnosci">Prywatność</Link>
        </span>
      </div>
    </footer>
  );
}
