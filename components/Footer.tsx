import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <div className="row" style={{ gap: 14 }}>
          <span className="logo">
            <Logo size={18} />
            WARSTWA
          </span>
          <span className="dim">© {new Date().getFullYear()} · Sieć drukarzy 3D</span>
        </div>
        <nav aria-label="Stopka">
          <Link href="/drukarze">Drukarze</Link>
          <Link href="/#jak-to-dziala">Jak to działa</Link>
          <Link href="/rejestracja">Zostań drukarzem</Link>
          <Link href="/panel">Panel</Link>
          <Link href="/regulamin">Regulamin</Link>
          <Link href="/polityka-prywatnosci">Prywatność</Link>
        </nav>
      </div>
    </footer>
  );
}
