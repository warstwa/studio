import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listMakerOffers, listRequests, offerCounts, storageIsPersistent, userMap } from "@/lib/data";
import { ago, zl } from "@/lib/format";
import type { PrintRequest, PublicUser, User } from "@/lib/types";
import { Arrow, Avatar, Empty, StatusPill } from "@/components/ui";
import { logoutAction } from "@/app/actions";

export const metadata: Metadata = { title: "Panel" };
export const dynamic = "force-dynamic";

const FINAL = ["completed", "rejected", "cancelled"];

function tabsFor(me: User, all: PrintRequest[], offered: Set<string>) {
  const mine = all.filter((r) => !r.parentId && r.clientId === me.id);
  const tabs: { id: string; label: string; items: PrintRequest[] }[] = [];
  if (me.maker) {
    tabs.push(
      { id: "do-decyzji", label: "Do decyzji", items: all.filter((r) => r.makerId === me.id && r.status === "pending") },
      {
        id: "realizacja",
        label: "W realizacji",
        items: all.filter((r) => r.makerId === me.id && ["accepted", "printing", "help_requested", "ready"].includes(r.status)),
      },
      { id: "oferty", label: "Moje oferty", items: all.filter((r) => offered.has(r.id) && r.status === "open") },
      { id: "pomoc", label: "Moje prośby o pomoc", items: all.filter((r) => r.requestedById === me.id) },
    );
  }
  tabs.push({ id: "zamowienia", label: "Moje zamówienia", items: mine });
  if (me.maker)
    tabs.push({ id: "archiwum", label: "Archiwum", items: all.filter((r) => r.makerId === me.id && FINAL.includes(r.status)) });
  return tabs;
}

export default async function Panel({ searchParams }: { searchParams: Promise<{ widok?: string }> }) {
  const me = await currentUser();
  if (!me) redirect("/logowanie?next=/panel");
  const { widok } = await searchParams;
  const all = await listRequests();
  const myOffers = me.maker ? await listMakerOffers(me.id) : [];
  const offerByReq = Object.fromEntries(myOffers.filter((o) => o.status !== "withdrawn").map((o) => [o.requestId, o]));
  const tabs = tabsFor(me, all, new Set(Object.keys(offerByReq)));
  const tab = tabs.find((t) => t.id === widok) ?? tabs[0];
  const people = await userMap(tab.items.flatMap((r) => [r.clientId, r.makerId, r.requestedById ?? ""]));

  const mine = all.filter((r) => !r.parentId && r.clientId === me.id);
  const counts = await offerCounts(mine.filter((r) => r.status === "open").map((r) => r.id));
  const kpis = me.maker
    ? [
        ["Do decyzji", tabs.find((t) => t.id === "do-decyzji")!.items.length],
        ["W realizacji", tabs.find((t) => t.id === "realizacja")!.items.length],
        ["Oferty w toku", tabs.find((t) => t.id === "oferty")!.items.length],
        ["Zrealizowane", me.maker.jobsDone],
      ]
    : [
        ["Aktywne", mine.filter((r) => !FINAL.includes(r.status)).length],
        ["Nowe oferty", Object.values(counts).reduce((a, b) => a + b, 0)],
        ["Zakończone", mine.filter((r) => r.status === "completed").length],
        ["Wydano", zl(mine.filter((r) => r.status === "completed").reduce((s, r) => s + (r.quote ?? 0), 0))],
      ];

  return (
    <div className="page">
      <div className="wrap">
        <div className="page-head">
          <div>
            <div className="crumbs mono">Panel / {me.maker ? "Drukarz" : "Zamawiający"}</div>
            <h1>Cześć, {me.name.split(" ")[0]}.</h1>
            <p>
              {me.maker
                ? "Przychodzące zapytania, zlecenia w druku i prośby o pomoc — wszystko w jednym miejscu."
                : "Tutaj śledzisz swoje zapytania od wysłania aż do odbioru."}
            </p>
          </div>
          <div className="row">
            {me.maker && <Link href="/zlecenia" className="btn">Przeglądaj zlecenia</Link>}
            <Link href="/zamow" className="btn btn-primary">
              Złóż zamówienie <Arrow />
            </Link>
            <form action={logoutAction}>
              <button className="btn btn-ghost" type="submit">Wyloguj</button>
            </form>
          </div>
        </div>

        {!storageIsPersistent() && (
          <div className="banner warn" style={{ marginBottom: 24 }}>
            Tryb demonstracyjny: dane są trzymane w pamięci serwera i mogą zniknąć po restarcie. Podłącz Upstash Redis w
            Vercelu, aby zapisywać je trwale.
          </div>
        )}

        <div className="kpis">
          {kpis.map(([k, v]) => (
            <div className="kpi" key={k as string}>
              <span className="mono dim">{k}</span>
              <b>{v}</b>
            </div>
          ))}
        </div>

        <nav className="tabs" aria-label="Widoki panelu">
          {tabs.map((t) => (
            <Link key={t.id} href={`/panel?widok=${t.id}`} aria-current={t.id === tab.id ? "page" : undefined} scroll={false}>
              {t.label}
              <span className="count">{t.items.length}</span>
            </Link>
          ))}
        </nav>

        {tab.items.length ? (
          <div className="req-list" key={tab.id}>
            {tab.items.map((r, i) => (
              <Row key={r.id} r={r} me={me} people={people} i={i} offers={counts[r.id]} myOffer={offerByReq[r.id]?.price} />
            ))}
          </div>
        ) : (
          <Empty
            title={tab.id === "do-decyzji" ? "Skrzynka pusta" : "Nic tu jeszcze nie ma"}
            text={
              tab.id === "do-decyzji"
                ? "Nowe zapytania od zamawiających i prośby o pomoc pojawią się tutaj."
                : tab.id === "zamowienia"
                  ? "Wgraj plik, opisz pomysł albo policz model w kalkulatorze — drukarze przyślą oferty."
                  : "Pojawią się tu zlecenia w tym etapie."
            }
            action={
              tab.id === "zamowienia" ? (
                <Link href="/zamow" className="btn">Złóż zamówienie <Arrow /></Link>
              ) : tab.id === "oferty" ? (
                <Link href="/zlecenia" className="btn">Przeglądaj zlecenia <Arrow /></Link>
              ) : undefined
            }
          />
        )}
      </div>
    </div>
  );
}

function Row({ r, me, people, i, offers, myOffer }: { r: PrintRequest; me: User; people: Record<string, PublicUser>; i: number; offers?: number; myOffer?: number }) {
  // kontrahent: dla drukarza — kto prosi; dla zamawiającego — kto drukuje
  const otherId = r.makerId === me.id ? (r.parentId ? r.requestedById! : r.clientId) : r.makerId;
  const other = people[otherId];
  const role = r.makerId === me.id ? (r.parentId ? "prosi" : "zamawia") : "drukuje";
  const market = r.status === "draft" || r.status === "open";
  return (
    <Link href={r.status === "draft" ? `/zamow/${r.id}` : `/zapytania/${r.id}`} className="req-row" style={{ ["--i" as string]: i }}>
      <span className="mono dim">{r.code}</span>
      <div style={{ minWidth: 0 }}>
        <div className="req-title">
          {r.parentId && <span className="tag-help">Pomoc</span>}
          {r.title.replace(/^Pomoc: /, "")}
        </div>
        <div className="req-sub">
          {r.material} · {r.quantity} szt. · {r.dims}
          {r.deadline && ` · do ${new Date(r.deadline).toLocaleDateString("pl-PL")}`}
        </div>
      </div>
      <div className="req-person">
        {market ? (
          <span className="dim">
            {r.status === "draft"
              ? "szkic — dokończ"
              : myOffer
                ? `Twoja oferta: ${myOffer} zł`
                : offers
                  ? <b className="accent">{offers} {offers === 1 ? "oferta" : offers < 5 ? "oferty" : "ofert"}</b>
                  : "czeka na oferty"}
          </span>
        ) : (
          <>
            {other && <Avatar name={other.name} size="sm" />}
            <span>
              <span className="dim">{role}</span> {other?.name.split(" ")[0] ?? "—"}
            </span>
          </>
        )}
      </div>
      <div><StatusPill status={r.status} /></div>
      <span className="req-when mono dim" style={{ textAlign: "right" }}>{ago(r.updatedAt)}</span>
    </Link>
  );
}
