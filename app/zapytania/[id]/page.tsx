import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { canView, getRequest, getReview, getTree, listMakers, listOffers, toPublic, userMap } from "@/lib/data";
import { EVENT_LABEL, STATUS, ago, date, zl } from "@/lib/format";
import type { PrintRequest, PublicUser, RequestEvent } from "@/lib/types";
import { Avatar, StatusPill } from "@/components/ui";
import Actions from "./Actions";
import OffersPanel from "./OffersPanel";
import FitList from "@/components/FitList";
import SlicerCard from "@/components/SlicerCard";
import FilesPanel from "@/components/FilesPanel";
import { bestFit } from "@/lib/match";
import CommentForm from "./CommentForm";
import ReviewForm from "./ReviewForm";
import ReviewCard from "@/components/ReviewCard";
import Gallery from "@/components/Gallery";
import { blobEnabled } from "@/lib/files";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const r = await getRequest((await params).id);
  return { title: r ? `${r.code} · ${r.title}` : "Zapytanie" };
}

const STEPS = ["Wysłane", "Przyjęte", "W druku", "Gotowe", "Odebrane"];
const STEP_OF: Record<string, number> = { pending: 0, help_requested: 0, accepted: 1, printing: 2, ready: 3, completed: 4 };

const EVENT_TONE: Partial<Record<RequestEvent["type"], string>> = {
  accepted: "var(--go)",
  help_accepted: "var(--go)",
  printing: "var(--go)",
  help_asked: "var(--help)",
  rejected: "var(--stop)",
  help_rejected: "var(--stop)",
  ready: "var(--accent)",
  completed: "var(--accent)",
  created: "var(--text)",
};

export default async function RequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ wyslano?: string; opublikowano?: string }>;
}) {
  const { id } = await params;
  const { wyslano, opublikowano } = await searchParams;
  const me = await currentUser();
  if (!me) redirect(`/logowanie?next=/zapytania/${id}`);
  const r = await getRequest(id);
  if (!r || !(await canView(r, me.id))) notFound();
  if (r.status === "draft") redirect(`/zamow/${r.id}`);

  const tree = await getTree(r.rootId);
  const parent = r.parentId ? tree.find((t) => t.id === r.parentId) : undefined;
  const people = await userMap([
    ...tree.flatMap((t) => [t.clientId, t.makerId, t.requestedById ?? ""]),
    ...r.events.map((e) => e.actorId),
  ]);
  const involved = new Set(tree.map((t) => t.makerId));
  const helpers = (await listMakers())
    .filter((m) => m.id !== me.id && m.id !== r.clientId)
    .map((m) => ({ ...toPublic(m), involved: involved.has(m.id) }));
  const reassignTo = (await listMakers())
    .filter((m) => m.id !== r.clientId && m.id !== r.makerId)
    .map(toPublic);

  const isMaker = r.makerId === me.id;
  const owner = r.parentId ? r.requestedById : r.clientId;
  const step = STEP_OF[r.status] ?? -1;
  const openChildren = tree.filter((t) => t.parentId === r.id && t.status === "pending");

  // giełda: oferty i dopasowanie
  const isOpen = r.status === "open";
  const offers = isOpen ? await listOffers(r.id) : [];
  const myOffer = offers.find((o) => o.makerId === me.id && o.status !== "withdrawn") ?? null;
  const allMakers = isOpen && owner === me.id ? await listMakers() : [];
  const fits = isOpen && owner === me.id ? bestFit(r, allMakers.filter((m) => m.id !== me.id)) : [];
  const fitById = Object.fromEntries(fits.map((f) => [f.makerId, f]));
  const offerPeople = isOpen ? await userMap(offers.map((o) => o.makerId)) : {};
  // oferty konkurencji są niejawne — drukarz widzi w historii tylko swoją
  const review = r.status === "completed" && !r.parentId ? await getReview(r.id) : null;
  const canReview = r.status === "completed" && !r.parentId && r.clientId === me.id && !review;
  const blob = blobEnabled();
  const events = r.events.filter((e) => e.type !== "offer" || owner === me.id || e.actorId === me.id);

  return (
    <div className="page">
      {wyslano && <div className="toast">Zapytanie {r.code} wysłane do: {people[r.makerId]?.name}</div>}
      {opublikowano && <div className="toast">Zlecenie {r.code} jest na giełdzie — drukarze mogą składać oferty</div>}
      <div className="wrap">
        <div className="crumbs mono">
          <Link href={r.status === "open" && owner !== me.id ? "/zlecenia" : "/panel"}>{r.status === "open" && owner !== me.id ? "Zlecenia" : "Panel"}</Link> / {parent && <><Link href={`/zapytania/${parent.id}`}>{parent.code}</Link> / </>}
          <span>{r.code}</span>
        </div>
        <div className="req-hero">
          <StatusPill status={r.status} />
          {r.parentId && <span className="tag-help">Prośba o pomoc</span>}
          <span className="mono dim">utworzono {ago(r.createdAt)}</span>
        </div>
        <h1 style={{ fontSize: "clamp(28px,3.6vw,44px)", maxWidth: 900, marginBottom: 32 }}>
          {r.title}
        </h1>

        <div className="two-col">
          <div className="stack">
            {r.parentId && parent && (
              <div className="banner">
                <span>
                  <b>{people[r.requestedById!]?.name}</b> prosi o wydrukowanie {r.quantity} szt. w ramach zlecenia{" "}
                  <Link href={`/zapytania/${parent.id}`} className="mono" style={{ textDecoration: "underline" }}>
                    {parent.code}
                  </Link>{" "}
                  dla: {people[r.clientId]?.name}.
                </span>
              </div>
            )}
            {r.status === "help_requested" && (
              <div className="banner">
                Drukarz {people[r.makerId]?.name} czeka na odpowiedź{" "}
                {openChildren.map((c) => people[c.makerId]?.name).join(", ") || "pomocnika"} — zlecenie zostanie
                przyjęte automatycznie, gdy ktoś dołączy.
              </div>
            )}

            {isOpen && owner === me.id && fits.length > 0 && offers.length === 0 && (
              <FitList fits={fits.slice(0, 3)} makers={Object.fromEntries(allMakers.map((m) => [m.id, toPublic(m)]))} invited={r.invited} title="Zaproszeni drukarze"
                note="Najlepiej dopasowani drukarze dostali zaproszenie. Zlecenie widzą też wszyscy drukarze w zakładce Zlecenia — oferty pojawią się tutaj." />
            )}
            {isOpen && owner === me.id && (
              <OffersPanel r={r} offers={offers} people={offerPeople} fits={fitById} />
            )}
            {isOpen && owner !== me.id && (
              <div className="banner">
                Zlecenie zbiera oferty ({offers.filter((o) => o.status === "pending").length}). Ceny innych drukarzy są niewidoczne — zamawiający wybierze jedną ofertę.
              </div>
            )}

            {!["rejected", "cancelled", "open"].includes(r.status) && (
              <div className="progress" aria-label={`Etap: ${STATUS[r.status].label}`}>
                {STEPS.map((s, i) => (
                  <div key={s} className={i <= step ? (i === step && step < 4 && step > 0 ? "on now" : "on") : ""} style={{ ["--i" as string]: i }}>
                    <i />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="specs">
              <Spec k="Materiał" v={r.material} />
              <Spec k="Kolor" v={r.color} />
              <Spec k="Ilość" v={`${r.quantity} szt.`} />
              <Spec k="Wymiary" v={r.dims} />
              <Spec k="Wypełnienie" v={`${r.infill}%`} />
              <Spec k="Warstwa" v={`${r.layerHeight} mm`} />
              <Spec k="Termin" v={date(r.deadline)} />
              <Spec k={r.quote ? "Wycena" : "Budżet"} v={r.quote ? zl(r.quote) : zl(r.budget)} accent={!!r.quote} />
            </div>

            {r.slicer && <SlicerCard s={r.slicer} />}
            {canReview && <ReviewForm id={r.id} makerName={people[r.makerId]?.name ?? "drukarz"} blob={blob} userId={me.id} />}
            {review && (
              <div className="panel">
                <div className="panel-head"><span className="mono">Ocena zamawiającego</span></div>
                <div className="panel-body"><ReviewCard r={review} author={people[review.clientId]} /></div>
              </div>
            )}
            {r.files && r.files.some((f) => f.kind === "image") && (
              <div className="panel">
                <div className="panel-head"><span className="mono">Zdjęcia</span><span className="mono dim">{r.files.filter((f) => f.kind === "image").length}</span></div>
                <div className="panel-body"><Gallery images={r.files.filter((f) => f.kind === "image")} alt={r.title} /></div>
              </div>
            )}
            {r.files && r.files.some((f) => f.kind !== "image") && <FilesPanel files={r.files.filter((f) => f.kind !== "image")} />}

            <div className="panel">
              <div className="panel-head">
                <span className="mono">Opis</span>
                {r.eta && <span className="mono dim">Termin wykonawcy: {date(r.eta)}</span>}
              </div>
              <div className="panel-body">
                <p className="desc">{r.description || "Brak opisu — szczegóły w plikach."}</p>
                {r.fileUrl && (
                  <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ marginTop: 18 }}>
                    Pobierz model ↗
                  </a>
                )}
              </div>
            </div>

            {tree.length > 1 && (
              <div className="panel">
                <div className="panel-head">
                  <span className="mono">Realizacja wspólna</span>
                  <span className="mono dim">{tree.length} zapytań</span>
                </div>
                <div className="panel-body tree">
                  {tree.map((t) => (
                    <Link key={t.id} href={`/zapytania/${t.id}`} className={t.id === r.id ? "current" : ""}>
                      <span className="indent">{"└─ ".repeat(depth(t, tree))}{t.code}</span>
                      <span>
                        {people[t.makerId]?.name} <span className="dim">· {t.quantity} szt.</span>
                      </span>
                      <StatusPill status={t.status} />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="panel">
              <div className="panel-head"><span className="mono">Historia i wiadomości</span></div>
              <div className="panel-body">
                <ol className="timeline">
                  {events.map((e, i) => (
                    <Event key={e.id} e={e} people={people} tree={tree} i={i} />
                  ))}
                </ol>
                <CommentForm id={r.id} blob={blob} userId={me.id} />
              </div>
            </div>
          </div>

          <aside className="stack sticky">
            <Actions
              r={r}
              isMaker={isMaker}
              isOwner={owner === me.id}
              helpers={helpers}
              reassignTo={reassignTo}
              openChildren={openChildren.length}
              viewerIsMaker={!!me.maker}
              myOffer={myOffer}
            />
            <div className="panel">
              <div className="panel-head"><span className="mono">Uczestnicy</span></div>
              <div className="panel-body spec" style={{ gap: 12 }}>
                <Person label="Zamawia" u={people[r.clientId]} />
                {r.requestedById && <Person label="Prosi o pomoc" u={people[r.requestedById]} />}
                <Person label={r.parentId ? "Pomaga" : "Drukuje"} u={people[r.makerId]} />
                {tree
                  .filter((t) => t.parentId === r.id && ["accepted", "printing", "ready", "completed"].includes(t.status))
                  .map((t) => (
                    <Person key={t.id} label={`Pomaga · ${t.quantity} szt.`} u={people[t.makerId]} />
                  ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function depth(t: PrintRequest, tree: PrintRequest[]): number {
  let d = 0;
  let cur = t;
  while (cur.parentId && d < 10) {
    const p = tree.find((x) => x.id === cur.parentId);
    if (!p) break;
    cur = p;
    d++;
  }
  return d;
}

function Spec({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div>
      <div className="mono dim">{k}</div>
      <div className={`v${accent ? " accent" : ""}`}>{v}</div>
    </div>
  );
}

function Person({ label, u }: { label: string; u?: PublicUser }) {
  if (!u) return null;
  const inner = (
    <>
      <Avatar name={u.name} size="sm" src={u.avatar} />
      <span style={{ flex: 1 }}>{u.name}</span>
      <span className="mono dim">{label}</span>
    </>
  );
  return u.maker ? (
    <Link href={`/drukarze/${u.id}`} className="row" style={{ flexWrap: "nowrap" }}>{inner}</Link>
  ) : (
    <div className="row" style={{ flexWrap: "nowrap" }}>{inner}</div>
  );
}

function Event({ e, people, tree, i }: { e: RequestEvent; people: Record<string, PublicUser>; tree: PrintRequest[]; i: number }) {
  const ref = e.refId ? tree.find((t) => t.id === e.refId) : undefined;
  const who = people[e.actorId]?.name ?? "Ktoś";
  return (
    <li style={{ ["--i" as string]: i }}>
      <span className="dot" style={{ ["--c" as string]: EVENT_TONE[e.type] ?? "var(--dim)" }}>
        <i />
      </span>
      <div>
        <div className="who">
          <b>{who}</b> <span className="muted">{EVENT_LABEL[e.type]}</span>
          {ref && (
            <Link className="ref" href={`/zapytania/${ref.id}`}>
              {ref.code}
            </Link>
          )}
          <time dateTime={new Date(e.at).toISOString()}>{ago(e.at)}</time>
        </div>
        {e.note && <div className="note">{e.note}</div>}
        {e.images && e.images.length > 0 && <Gallery images={e.images} variant="strip" />}
      </div>
    </li>
  );
}
