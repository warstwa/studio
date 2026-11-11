import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { listRequests, offerCounts } from "@/lib/data";
import NavShell from "./NavShell";
import Logo from "./Logo";

export default async function Nav() {
  const user = await currentUser();
  let pending = 0;
  if (user) {
    const all = await listRequests();
    pending =
      all.filter((r) => r.makerId === user.id && r.status === "pending" && !r.approval).length +
      all.filter((r) => r.clientId === user.id && (r.approval || r.status === "ready" || (r.status === "rejected" && !r.parentId))).length;
    // oferty czekające na decyzję zamawiającego
    const mineOpen = all.filter((r) => r.clientId === user.id && r.status === "open").map((r) => r.id);
    if (mineOpen.length) pending += Object.values(await offerCounts(mineOpen)).reduce((a, b) => a + b, 0);
  }
  return (
    <NavShell>
      <Link href="/" className="logo" aria-label="Warstwa — strona główna">
        <Logo />
        WARSTWA
      </Link>
      <nav className="nav-links" aria-label="Główna nawigacja">
        <Link href="/zlecenia">Zlecenia</Link>
        <Link href="/drukarze">Drukarze</Link>
        <Link href="/slicer">Slicer</Link>
        <Link href="/#jak-to-dziala">Jak to działa</Link>
      </nav>
      <div className="nav-right">
        {user ? (
          <>
            <Link href="/profil" className="btn btn-ghost btn-sm hide-sm">
              {user.name.split(" ")[0]}
            </Link>
            <Link href="/panel" className="btn btn-sm">
              Panel
              {pending > 0 && <span className="nav-badge">{pending}</span>}
            </Link>
            <Link href="/zamow" className="btn btn-primary btn-sm hide-xs">
              Złóż zamówienie
            </Link>
          </>
        ) : (
          <>
            <Link href="/logowanie" className="btn btn-ghost btn-sm hide-sm">
              Zaloguj się
            </Link>
            <Link href="/rejestracja" className="btn btn-primary btn-sm">
              Załóż konto
            </Link>
          </>
        )}
      </div>
    </NavShell>
  );
}
