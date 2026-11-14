import Link from "next/link";
import HeroPrint from "@/components/HeroPrint";
import FlowDiagram from "@/components/FlowDiagram";
import Reveal, { SplitHeading } from "@/components/Reveal";
import Counter from "@/components/Counter";
import { Arrow, MakerCard } from "@/components/ui";
import { listMakers, listRequests, toPublic } from "@/lib/data";
import { MATERIALS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ konto?: string }> }) {
  const { konto } = await searchParams;
  const makers = await listMakers();
  const reqs = await listRequests();
  const featured = makers.slice(0, 6).map(toPublic);
  const jobs = makers.reduce((s, m) => s + (m.maker?.jobsDone ?? 0), 0);
  const cities = new Set(makers.map((m) => m.city)).size;
  const collab = reqs.filter((r) => r.parentId).length;

  return (
    <>
      {konto === "usuniete" && <div className="toast">Konto zostało usunięte. Dziękujemy, że byłeś(-aś) z nami.</div>}
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <Reveal className="eyebrow mono">
              <span className="pulse" />
              {makers.filter((m) => m.maker?.available).length} drukarzy przyjmuje teraz zlecenia
            </Reveal>
            <SplitHeading
              as="h1"
              lines={[
                "Druk 3D",
                <>
                  od ludzi, którzy <em>mają</em>
                </>,
                "drukarki.",
              ]}
            />
            <Reveal delay={4}>
              <p className="hero-lead">
                Wgraj model albo opisz pomysł. Dopasujemy drukarzy, którzy pasują najlepiej — przyślą oferty z ceną
                i terminem, a Ty wybierasz. Za duża seria? Drukarze zaproszą kolejnych do pomocy.
              </p>
            </Reveal>
            <Reveal delay={5} className="hero-cta">
              <Link href="/zamow" className="btn btn-primary btn-lg">
                Złóż zamówienie <Arrow />
              </Link>
              <Link href="/rejestracja?rola=drukarz" className="btn btn-lg">
                Mam drukarkę
              </Link>
            </Reveal>
            <Reveal delay={6} className="hero-stats">
              <div>
                <b><Counter to={jobs} /></b>
                <span className="mono dim">wydrukowanych zleceń</span>
              </div>
              <div>
                <b><Counter to={cities} /></b>
                <span className="mono dim">miast</span>
              </div>
              <div>
                <b><Counter to={4.85} decimals={2} /></b>
                <span className="mono dim">średnia ocen</span>
              </div>
            </Reveal>
          </div>
          <Reveal delay={2}>
            <HeroPrint />
          </Reveal>
        </div>
      </section>

      <div className="marquee" aria-hidden>
        <div className="marquee-track mono">
          {[0, 1].map((k) =>
            [...MATERIALS, "FDM", "SLA", "MSLA", "Wielokolor", "Komora grzana", "0.05 mm"].map((m) => (
              <span key={`${k}-${m}`}>{m}</span>
            )),
          )}
        </div>
      </div>

      <section className="section" id="jak-to-dziala">
        <div className="wrap">
          <div className="section-head">
            <div className="section-num mono"><b>01</b> / Przepływ zlecenia</div>
            <div>
              <SplitHeading lines={["Jedno zlecenie.", "Najlepsi drukarze odpowiadają."]} />
              <Reveal delay={2}>
                <p>
                  Nie szukasz drukarza na własną rękę. Zlecenie trafia na giełdę, najlepiej dopasowani dostają
                  zaproszenie, a Ty porównujesz oferty. Gdy drukarz nie da rady sam, przekazuje część pracy komuś z sieci.
                </p>
              </Reveal>
            </div>
          </div>
          <Reveal>
            <FlowDiagram />
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div className="section-num mono"><b>02</b> / Drukarze</div>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
              <SplitHeading lines={["Sprawdzone maszyny,", "konkretni ludzie."]} />
              <Reveal delay={2}>
                <Link href="/drukarze" className="btn">
                  Wszyscy drukarze <Arrow />
                </Link>
              </Reveal>
            </div>
          </div>
          <Reveal className="makers-grid">
            {featured.map((u) => (
              <MakerCard key={u.id} u={u} />
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section" id="dla-drukarzy">
        <div className="wrap">
          <div className="section-head">
            <div className="section-num mono"><b>03</b> / Dla drukarzy</div>
            <div>
              <SplitHeading lines={["Twoja drukarka", "zarabia, gdy stoi."]} />
              <Reveal delay={2}>
                <p>
                  Ustaw materiały, maszyny i stawkę. Zlecenia przychodzą do skrzynki — decydujesz o każdym z
                  nich. {collab > 0 && `Już ${collab} zleceń zrealizowano wspólnie przez kilku drukarzy.`}
                </p>
              </Reveal>
            </div>
          </div>
          <div className="feat-grid">
            {[
              {
                t: "Giełda zleceń",
                d: "Zlecenia dopasowane do Twoich maszyn i materiałów — z plikami i wyliczeniem z kalkulatora.",
                i: <path d="M3 8l11 7 11-7M3 8v14h22V8L14 3z" />,
              },
              {
                t: "Oferta w minutę",
                d: "Cena, termin i krótka notatka. Klient porównuje oferty i wybiera — bez licytowania w wiadomościach.",
                i: <path d="M4 14l6 6L24 6" />,
              },
              {
                t: "Prośba o pomoc",
                d: "Za duża seria? Oddaj część sztuk innemu drukarzowi i zrealizujcie ją razem.",
                i: <path d="M9 10a4 4 0 100-8 4 4 0 000 8zM19 10a4 4 0 100-8 4 4 0 000 8zM2 24c0-5 3-8 7-8s7 3 7 8M14 24c0-5 2-8 5-8s7 3 7 8" />,
              },
              {
                t: "Statusy na żywo",
                d: "Przyjęte, w druku, wysłane — klient widzi każdy etap bez dopytywania.",
                i: <path d="M3 14h5l3-8 6 16 3-8h5" />,
              },
            ].map((f, i) => (
              <Reveal key={f.t} className="feat" delay={i}>
                <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                  {f.i}
                </svg>
                <h3>{f.t}</h3>
                <p>{f.d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="cta-lines" aria-hidden>
          {[18, 34, 50, 66, 82].map((top, i) => (
            <span key={top} style={{ top: `${top}%`, ["--i" as string]: i }} />
          ))}
        </div>
        <div className="wrap">
          <SplitHeading lines={["Masz model?", "Ktoś go wydrukuje."]} />
          <Reveal delay={2}>
            <p>Załóż konto w minutę albo wejdź na konto demo i przejdź cały proces od zapytania do odbioru.</p>
          </Reveal>
          <Reveal delay={3} className="row" style={{ justifyContent: "center" }}>
            <Link href="/rejestracja" className="btn btn-primary btn-lg">
              Załóż konto <Arrow />
            </Link>
            <Link href="/logowanie" className="btn btn-lg">
              Konto demo
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
