import { ago } from "@/lib/format";
import type { PublicUser, Review } from "@/lib/types";
import Gallery from "./Gallery";
import StarsView from "./StarsView";
import { Avatar } from "./ui";

export default function ReviewCard({ r, author, i = 0 }: { r: Review; author?: PublicUser; i?: number }) {
  return (
    <article className="review" style={{ ["--i" as string]: i }}>
      <header>
        <Avatar name={author?.name ?? "Klient"} size="sm" src={author?.avatar} />
        <div style={{ minWidth: 0 }}>
          <b>{author?.name.split(" ")[0] ?? "Klient"}</b>
          <span className="dim"> · {r.title}</span>
        </div>
        <span className="review-score">
          <StarsView value={r.rating} /> <b>{r.rating.toFixed(1)}</b>
        </span>
      </header>
      {r.text && <p>{r.text}</p>}
      <Gallery images={r.photos} variant="strip" alt={r.title} />
      <footer className="dim">
        jakość {r.quality}/5 · kontakt {r.communication}/5 · terminowość {r.timeliness}/5 · {ago(r.createdAt)}
      </footer>
    </article>
  );
}
