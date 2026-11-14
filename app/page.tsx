import Link from "next/link";
import Reveal from "@/components/Reveal";
import Counter from "@/components/Counter";
import HeroPrint from "@/components/HeroPrint";
import { SplitHeading } from "@/components/Reveal";
import { Arrow } from "@/components/ui";
import Logo from "@/components/Logo";
import { IsoFarm, IsoHotend, IsoSplit } from "@/components/Iso";
import { ArrowLink, Ne, NumList, Plate, SectionBar } from "@/components/bx";
import { listMakers } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Przykładowe zużycie filamentu na warstwę (uchwyt, 84 warstwy, 38 g). */
function layerSeries() {
  const raw = Array.from({ length: 84 }, (_, i) => {
    if (i < 4) return 0.92;
    if (i >= 80) return 0.7;
    const hole = i > 30 && i < 52 ? 0.82 : 1;
    return 0.46 * hole + Math.sin(i / 5) * 0.02;
  });
  const k = 38 / raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => v * k);
}

function LayerChart() {
  const ys = layerSeries();
  const W = 520,
    H = 200,
    max = 1;
  const x = (i: number) => 36 + (i / ys.length) * (W - 44);
  const y = (v: number) => H - 26 - (v / max) * (H - 50);
  let d = `M${x(0)},${y(ys[0])}`;
  ys.forEach((v, i) => {
    d += ` H${x(i).toFixed(1)} V${y(v).toFixed(1)}`;
  });
  d += ` H${x(ys.length)}`;
  return (
    <svg className="lchart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Przykładowe zużycie filamentu na kolejnych warstwach">
      {[0, 0.25, 0.5, 0.75, 1].map((g) => (
        <g key={g}>
          <line x1="36" x2={W - 8} y1={y(g)} y2={y(g)} className="grid" />
          <text x="28" y={y(g) + 3} textAnchor="end">
            {g.toFixed(2)}
          </text>
        </g>
      ))}
      {[1, 21, 42, 63, 84].map((l) => (
        <text key={l} x={x(l - 1)} y={H - 8} textAnchor="middle">
          {l}
        </text>
      ))}
      <path d={`${d} V${y(0)} H${x(0)} Z`} className="area" />
      <path d={d} className="stroke" pathLength={1} />
    </svg>
  );
}

export default async function Home({ searchParams }: { searchParams: Promise<{ konto?: string }> }) {
  const { konto } = await searchParams;
  const makers = await listMakers();
  const available = makers.filter((m) => m.maker?.available).length;
  const cities = new Set(makers.map((m) => m.city)).size;
  const machines = makers.reduce((s, m) => s + (m.maker?.printers.length ?? 0), 0);
  const rated = makers.filter((m) => (m.maker?.ratingCount ?? 0) > 0 || (m.maker?.jobsDone ?? 0) > 0);
  const avg = rated.length ? rated.reduce((s, m) => s + m.maker!.rating, 0) / rated.length : 0;
  const top = makers.slice(0, 5);
  const jobs = makers.reduce((s, m) => s + (m.maker?.jobsDone ?? 0), 0);

  return (
    <>
      {konto === "usuniete" && <div className="toast">Konto zostało usunięte. Dziękujemy, że byłeś(-aś) z nami.</div>}

      {/* ───── HERO (pierwszy ekran) ───── */}
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
                <b><Counter to={avg} decimals={2} /></b>
                <span className="mono dim">średnia ocen</span>
              </div>
            </Reveal>
          </div>
          <Reveal delay={2}>
            <HeroPrint />
          </Reveal>
        </div>
      </section>

      <section className="hero-index">
        <div className="wrap">
          <div className="hero-cols">
            {[
              ["01", "Zamówienia", "Plik, pomysł albo projekt prosto z kalkulatora."],
              ["02", "Drukarze", "Ludzie z maszynami w Twojej okolicy przysyłają oferty."],
              ["03", "Wspólny druk", "Duża seria? Kilku drukarzy drukuje równolegle."],
              ["04", "Kalkulator", "Czas, warstwy i materiał, zanim zapytasz."],
            ].map(([n, t, d], i) => (
              <Reveal key={n} delay={i} className="hero-col">
                <a href={`#s${n}`}>
                  <span className="mono dim">
                    <span className="sq" aria-hidden /> {n} / {t}
                  </span>
                  <p>{d}</p>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───── 01 ZAMÓWIENIA ───── */}
      <section className="bx-sec" id="s01">
        <span id="jak-to-dziala" className="anchor" />
        <div className="wrap">
          <SectionBar num="01" title="Zamówienia" meta={[["Pliki", "STL · 3MF · OBJ · STEP"], ["Dopasowanie", "best fit"], ["Oferty", "od drukarzy"]]} />
          <div className="split">
            <div className="split-text">
              <Reveal as="h2" className="bx-h2">
                Wgraj model. Drukarze przyślą oferty.
              </Reveal>
              <Reveal delay={1}>
                <p className="bx-p">
                  Nie szukasz drukarza na własną rękę. Zamówienie trafia na giełdę, najlepiej dopasowani drukarze dostają
                  zaproszenie, a Ty porównujesz cenę, termin i opinie.
                </p>
              </Reveal>
              <Reveal delay={2}>
                <NumList
                  items={[
                    { k: "Plik", t: "Wgraj STL, 3MF, OBJ albo STEP. Zdjęcia i rysunki też." },
                    { k: "Pomysł", t: "Nie masz modelu? Opisz, co ma powstać." },
                    { k: "Kalkulator", t: "Policz czas i materiał, potem „Dodaj do zamówienia”." },
                  ]}
                />
              </Reveal>
            </div>
            <Reveal delay={1}>
              <Plate label="FIG. 01 · GIEŁDA ZLECEŃ">
                <IsoFarm />
              </Plate>
            </Reveal>
          </div>
          <div className="closer">
            <div>
              <p className="closer-t">Wybierasz ofertę, nie drukarza w ciemno.</p>
              <ArrowLink href="/zamow">Złóż zamówienie</ArrowLink>
            </div>
            <div className="closer-stat">
              <b className="stripe">
                <Counter to={available} />
              </b>
              <span className="mono dim">drukarzy przyjmuje teraz zlecenia</span>
            </div>
          </div>
        </div>
      </section>

      {/* ───── 02 DRUKARZE ───── */}
      <section className="bx-sec" id="s02">
        <div className="wrap">
          <SectionBar
            num="02"
            title="Drukarze"
            meta={[["Maszyny", String(machines)], ["Miasta", String(cities)], ["Średnia ocen", avg ? avg.toFixed(2) : "—"]]}
          />
          <div className="split rev">
            <Reveal>
              <Plate label="FIG. 02 · GŁOWICA">
                <IsoHotend />
              </Plate>
            </Reveal>
            <div className="split-text">
              <Reveal as="h2" className="bx-h2">
                Twoja drukarka zarabia, gdy stoi.
              </Reveal>
              <Reveal delay={1}>
                <p className="bx-p">
                  Ustaw maszyny, materiały i stawkę. Zlecenia dopasowane do Twojego sprzętu czekają na giełdzie, a o każdej
                  ofercie decydujesz sam.
                </p>
              </Reveal>
              <Reveal delay={2}>
                <NumList
                  items={[
                    { k: "Profil", t: "Maszyny, pole robocze, materiały i galeria realizacji." },
                    { k: "Giełda", t: "Zlecenia z plikami i wyliczeniem z kalkulatora." },
                    { k: "Oferta", t: "Cena, termin, notatka. Bez licytowania w wiadomościach." },
                  ]}
                />
              </Reveal>
              <Reveal delay={3} className="bx-cta">
                <Link href="/rejestracja?rola=drukarz" className="btn btn-primary">
                  Dołącz jako drukarz <Ne />
                </Link>
              </Reveal>
            </div>
          </div>

          {top.length > 0 && (
            <Reveal className="mtable">
              <div className="mtable-head mono">
                <span>Drukarz</span>
                <span className="hide-sm">Maszyny</span>
                <span className="hide-sm">Materiały</span>
                <span>Ocena</span>
                <span>Status</span>
              </div>
              {top.map((u) => {
                const m = u.maker!;
                return (
                  <Link key={u.id} href={`/drukarze/${u.id}`} className="mtable-row">
                    <span>
                      <b>{u.name}</b>
                      <span className="mono dim">{u.city}</span>
                    </span>
                    <span className="hide-sm muted">{m.printers.slice(0, 2).join(", ")}</span>
                    <span className="hide-sm mono dim">{m.materials.slice(0, 4).join(" · ")}</span>
                    <span className="rate">
                      <span className="rate-bar" aria-hidden>
                        <i style={{ width: `${(m.rating / 5) * 100}%` }} />
                      </span>
                      <span className="code">{m.rating.toFixed(1)}</span>
                    </span>
                    <span className={`mono ${m.available ? "accent" : "dim"}`}>{m.available ? "■ przyjmuje" : "□ zajęty"}</span>
                  </Link>
                );
              })}
            </Reveal>
          )}
          <div className="closer">
            <div>
              <p className="closer-t">Sprawdzone maszyny, konkretni ludzie.</p>
              <ArrowLink href="/drukarze">Wszyscy drukarze</ArrowLink>
            </div>
          </div>
        </div>
      </section>

      {/* ───── 03 WSPÓLNY DRUK ───── */}
      <section className="bx-sec" id="s03">
        <div className="wrap">
          <SectionBar num="03" title="Wspólny druk" meta={[["Podział", "przy akceptacji"], ["Wysyłka", "prosto do Ciebie"], ["Ocena", "każdego drukarza"]]} />
          <div className="split">
            <div className="split-text">
              <Reveal as="h2" className="bx-h2">
                Duża seria? Drukuje kilku naraz.
              </Reveal>
              <Reveal delay={1}>
                <p className="bx-p">
                  Przy akceptacji ofert dzielisz zamówienie między kilku drukarzy. Każdy drukuje swoją część i wysyła ją
                  prosto do Ciebie, a Ty oceniasz każdego osobno.
                </p>
              </Reveal>
              <Reveal delay={2}>
                <NumList
                  items={[
                    { k: "Podział", t: "Ustalasz, ile sztuk drukuje każdy z drukarzy." },
                    { k: "Pomoc", t: "Drukarz może poprosić kogoś z sieci o wsparcie." },
                    { k: "Akceptacja", t: "Każdy etap, od przyjęcia po wysyłkę, zatwierdzasz Ty." },
                  ]}
                />
              </Reveal>
            </div>
            <Reveal delay={1}>
              <Plate label="FIG. 03 · PODZIAŁ SERII">
                <IsoSplit />
              </Plate>
            </Reveal>
          </div>
          <div className="closer">
            <div>
              <p className="closer-t">Nic nie dzieje się bez Twojej zgody.</p>
              <ArrowLink href="/zlecenia">Zobacz giełdę zleceń</ArrowLink>
            </div>
          </div>
        </div>
      </section>

      {/* ───── 04 KALKULATOR ───── */}
      <section className="bx-sec" id="s04">
        <div className="wrap">
          <SectionBar num="04" title="Kalkulator" meta={[["Model", "uchwyt.3mf"], ["Warstwa", "0.20 mm"], ["Materiał", "PETG"]]} />
          <div className="calc">
            <Reveal className="calc-chart">
              <div className="calc-chart-head mono">
                <span>Filament na warstwę [g]</span>
                <span className="dim">warstwa 1 → 84</span>
              </div>
              <LayerChart />
            </Reveal>
            <div className="tiles">
              {[
                ["84", "warstwy", ""],
                ["2:14", "h druku / szt.", ""],
                ["38 g", "PETG / szt.", ""],
                ["12", "sztuk w zamówieniu", "acc"],
              ].map(([v, l, tone], i) => (
                <Reveal key={l} delay={i} className={`tile ${tone}`}>
                  <b className="stripe">{v}</b>
                  <span className="mono">{l}</span>
                </Reveal>
              ))}
            </div>
          </div>
          <div className="closer">
            <div>
              <p className="closer-t">Policz, zanim zapytasz.</p>
              <ArrowLink href="/slicer">Otwórz kalkulator</ArrowLink>
            </div>
            <p className="mono dim calc-note">Przykładowe wyliczenie dla uchwytu 64 × 48 × 16.8 mm</p>
          </div>
        </div>
      </section>

      {/* ───── BEZPIECZEŃSTWO ───── */}
      <section className="bx-sec tight">
        <div className="wrap">
          <div className="trust">
          <div>
            <span className="mono dim">
              <span className="sq" aria-hidden /> Bezpieczeństwo i dane
            </span>
            <div className="chips mono">
              {["HTTPS", "Hasła: scrypt + sól", "Sesje: HMAC", "RODO", "Usuwanie konta"].map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
          </div>
          <ArrowLink href="/polityka-prywatnosci#p8">Polityka prywatności</ArrowLink>
          </div>
        </div>
      </section>

      {/* ───── CTA ───── */}
      <section className="band">
        <div className="band-tag mono">// następny krok</div>
        <div className="band-inner">
          <div className="band-main">
            <Reveal as="h2" className="band-h">
              Twój model.
              <br /> Twój termin.
              <br /> Twój drukarz.
            </Reveal>
            <Reveal delay={2} className="bx-cta">
              <Link href="/zamow" className="btn btn-primary">
                Złóż zamówienie <Ne />
              </Link>
              <Link href="/rejestracja" className="btn">
                Załóż konto
              </Link>
            </Reveal>
          </div>
          <div className="band-mark" aria-hidden>
            <Logo size={160} />
          </div>
        </div>
      </section>
    </>
  );
}
