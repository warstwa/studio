import Link from "next/link";
import type { Fit } from "@/lib/match";
import type { PublicUser } from "@/lib/types";
import { Avatar } from "./ui";

/** Lista najlepiej dopasowanych drukarzy z wynikiem i powodami. */
export default function FitList({
  fits,
  makers,
  title,
  note,
  invited = [],
}: {
  fits: Fit[];
  makers: Record<string, PublicUser>;
  title: string;
  note?: string;
  invited?: string[];
}) {
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="mono">{title}</span>
        <span className="mono dim">best fit</span>
      </div>
      <div className="panel-body fit-list">
        {fits.length === 0 && <p className="muted">Brak drukarzy w sieci.</p>}
        {fits.map((f, i) => {
          const u = makers[f.makerId];
          if (!u) return null;
          return (
            <Link key={f.makerId} href={`/drukarze/${u.id}`} className="fit-row" style={{ ["--i" as string]: i, ["--s" as string]: `${f.score}%` }}>
              <Avatar name={u.name} size="sm" />
              <div className="fit-main">
                <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
                  <b className="ellipsis">{u.name}</b>
                  {invited.includes(u.id) && <span className="tag-help">Zaproszony</span>}
                </div>
                <div className="fit-bar"><i /></div>
                <div className="fit-why">
                  {f.reasons.slice(0, 2).join(" · ")}
                  {f.warnings[0] && <span className="fit-warn"> · {f.warnings[0]}</span>}
                </div>
              </div>
              <span className="fit-score">{f.score}%</span>
            </Link>
          );
        })}
        {note && <p className="hint" style={{ marginTop: 6 }}>{note}</p>}
      </div>
    </div>
  );
}
