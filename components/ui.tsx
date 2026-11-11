import Link from "next/link";
import { STATUS, initials } from "@/lib/format";
import type { PublicUser, RequestStatus } from "@/lib/types";
import Spotlight from "./Spotlight";

export function StatusPill({ status }: { status: RequestStatus }) {
  const s = STATUS[status];
  return <span className={`pill ${s.tone}`}>{s.label}</span>;
}

export function Avatar({ name, size, src }: { name: string; size?: "sm" | "lg"; src?: string }) {
  return (
    <span className={`avatar${size ? " " + size : ""}`} aria-hidden>
      {src ? <img src={src} alt="" loading="lazy" /> : initials(name)}
    </span>
  );
}

export function MakerCard({ u }: { u: PublicUser }) {
  const m = u.maker!;
  return (
    <Spotlight className="maker-card">
      <Link href={`/drukarze/${u.id}`} className="card-link" aria-label={`Profil: ${u.name}`} />
      <div className={`maker-cover${u.portfolio?.length ? "" : " empty"}`}>
        {u.portfolio?.length ? (
          <img src={u.portfolio[0].url} alt={`Realizacja: ${u.name}`} loading="lazy" />
        ) : (
          <span className="mono dim">Brak zdjęć realizacji</span>
        )}
        {(u.portfolio?.length ?? 0) > 1 && <span className="cover-count mono">+{u.portfolio!.length - 1} zdjęć</span>}
      </div>
      <div className="maker-top">
        <Avatar name={u.name} src={u.avatar} />
        <div>
          <h3>{u.name}</h3>
          <div className="mono dim">{u.city}</div>
        </div>
        <span className={`avail${m.available ? "" : " off"}`}>{m.available ? "Dostępny" : "Zajęty"}</span>
      </div>
      <p className="headline">{m.headline}</p>
      <div className="chips">
        {m.materials.slice(0, 5).map((x) => (
          <span key={x} className="chip">{x}</span>
        ))}
        {m.materials.length > 5 && <span className="chip">+{m.materials.length - 5}</span>}
      </div>
      <div className="spec">
        <div className="spec-row">
          <span>Maszyny</span>
          <span>{m.printers.join(", ") || "—"}</span>
        </div>
        <div className="spec-row">
          <span>Realizacja</span>
          <span>
            ~{m.leadDays} dni · od {m.hourlyRate} zł/h
          </span>
        </div>
        <div className="spec-row">
          <span>Zlecenia</span>
          <span>
            {m.jobsDone} {m.rating > 0 && <>· ★ {m.rating.toFixed(2)}{m.ratingCount ? <span className="dim"> ({m.ratingCount})</span> : null}</>}
          </span>
        </div>
      </div>
    </Spotlight>
  );
}

export function Empty({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
        <path d="M8 34h32M10 28h28M12 22h24" opacity=".5" />
        <path d="M14 16h20" strokeDasharray="2 3" />
        <path d="M22 6h4v6l-2 3-2-3z" />
      </svg>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}

export function Arrow() {
  return (
    <svg className="arrow" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M1 7h11M8 3l4 4-4 4" />
    </svg>
  );
}
