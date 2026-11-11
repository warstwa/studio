import Link from "next/link";
import { notFound } from "next/navigation";
import { getUser, listRequests, listReviews, userMap } from "@/lib/data";
import Gallery from "@/components/Gallery";
import ReviewCard from "@/components/ReviewCard";
import StarsView from "@/components/StarsView";
import { currentUser } from "@/lib/auth";
import { Arrow, Avatar } from "@/components/ui";
import Reveal from "@/components/Reveal";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const u = await getUser((await params).id);
  return { title: u?.name ?? "Drukarz" };
}

export default async function MakerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await getUser(id);
  if (!u?.maker) notFound();
  const me = await currentUser();
  const m = u.maker;
  const reviews = await listReviews(u.id);
  const authors = await userMap(reviews.map((r) => r.clientId));
  const reviewPhotos = reviews.flatMap((r) => r.photos);
  const active = (await listRequests()).filter(
    (r) => r.makerId === u.id && ["accepted", "printing"].includes(r.status),
  ).length;

  return (
    <div className="page">
      <div className="wrap">
        <div className="crumbs mono">
          <Link href="/drukarze">Drukarze</Link> / <span>{u.name}</span>
        </div>
        <Reveal className="profile-hero" style={{ marginBottom: 40 }}>
          <Avatar name={u.name} size="lg" src={u.avatar} />
          <div>
            <h1 style={{ fontSize: "clamp(30px,4vw,48px)" }}>{u.name}</h1>
            <div className="row" style={{ marginTop: 10 }}>
              <span className="mono dim">{u.city}</span>
              <span className={`avail${m.available ? "" : " off"}`} style={{ marginLeft: 0 }}>
                {m.available ? "Przyjmuje zlecenia" : "Chwilowo zajęty"}
              </span>
            </div>
          </div>
          {me?.id === u.id ? (
            <Link href="/profil" className="btn">Edytuj profil</Link>
          ) : (
            <Link href={`/zapytania/nowe?drukarz=${u.id}`} className="btn btn-primary btn-lg">
              Wyślij zapytanie <Arrow />
            </Link>
          )}
        </Reveal>

        <Reveal className="stat-strip" delay={1} style={{ marginBottom: 32 }}>
          <div><span className="mono dim">Zlecenia</span><b>{m.jobsDone}</b></div>
          <div><span className="mono dim">Ocena</span><b>{m.rating ? `★ ${m.rating.toFixed(2)}` : "—"}</b></div>
          <div><span className="mono dim">Stawka</span><b>{m.hourlyRate} zł/h</b></div>
          <div><span className="mono dim">W realizacji</span><b>{active}</b></div>
        </Reveal>

        <div className="two-col">
          <Reveal className="stack" delay={2}>
            <div className="panel">
              <div className="panel-head"><span className="mono">O drukarzu</span></div>
              <div className="panel-body">
                <p style={{ fontSize: 20, marginBottom: 14, letterSpacing: "-0.01em" }}>{m.headline}</p>
                <p className="desc">{u.bio || "Ten drukarz nie dodał jeszcze opisu."}</p>
              </div>
            </div>
            <div className="panel">
              <div className="panel-head"><span className="mono">Materiały</span></div>
              <div className="panel-body chips">
                {m.materials.length ? m.materials.map((x) => <span className="chip" key={x}>{x}</span>) : <span className="muted">—</span>}
              </div>
            </div>
            <div className="panel">
              <div className="panel-head">
                <span className="mono">Realizacje</span>
                <span className="mono dim">{(u.portfolio?.length ?? 0) + reviewPhotos.length} zdjęć</span>
              </div>
              <div className="panel-body">
                {u.portfolio?.length || reviewPhotos.length ? (
                  <Gallery images={[...(u.portfolio ?? []), ...reviewPhotos]} alt={`Realizacja: ${u.name}`} />
                ) : (
                  <p className="muted">Drukarz nie dodał jeszcze zdjęć swoich wydruków.</p>
                )}
              </div>
            </div>
            <div className="panel" id="opinie">
              <div className="panel-head">
                <span className="mono">Opinie</span>
                {m.rating > 0 && (
                  <span className="review-score"><StarsView value={m.rating} /> <b>{m.rating.toFixed(2)}</b> <span className="dim">· {m.ratingCount ?? reviews.length} ocen</span></span>
                )}
              </div>
              <div className="panel-body reviews">
                {reviews.length ? reviews.map((r, i) => <ReviewCard key={r.id} r={r} author={authors[r.clientId]} i={i} />) : <p className="muted">Brak opinii — pierwsze pojawią się po zakończonych zleceniach.</p>}
              </div>
            </div>
          </Reveal>
          <Reveal className="panel sticky" delay={3}>
            <div className="panel-head"><span className="mono">Park maszynowy</span></div>
            <div className="panel-body spec">
              {m.printers.map((p) => (
                <div className="spec-row" key={p}><span>Drukarka</span><span>{p}</span></div>
              ))}
              <div className="spec-row"><span>Pole robocze</span><span>{m.buildVolume || "—"}</span></div>
              <div className="spec-row"><span>Czas realizacji</span><span>~{m.leadDays} dni</span></div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
