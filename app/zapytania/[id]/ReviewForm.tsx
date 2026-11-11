"use client";
import { useActionState, useState } from "react";
import { reviewAction } from "@/app/actions";
import Submit from "@/components/Submit";
import ImageAttach from "@/components/ImageAttach";
import { StarsInput } from "@/components/Stars";

export default function ReviewForm({ id, makerName, blob, userId }: { id: string; makerName: string; blob: boolean; userId: string }) {
  const [state, action] = useActionState(reviewAction, undefined);
  const [busy, setBusy] = useState(false);
  return (
    <form action={action} className="panel review-form" id="ocena">
      <input type="hidden" name="id" value={id} />
      <div className="panel-head">
        <span className="mono">Oceń wydruk</span>
        <span className="mono dim">{makerName}</span>
      </div>
      <div className="panel-body form">
        <p className="muted" style={{ fontSize: 14 }}>
          Twoja ocena pojawi się na profilu drukarza i pomoże innym wybrać. Dodaj zdjęcie wydruku — to najcenniejsza część opinii.
        </p>
        <div className="stars-grid">
          <StarsInput name="quality" label="Jakość wydruku" />
          <StarsInput name="communication" label="Kontakt" />
          <StarsInput name="timeliness" label="Terminowość" />
        </div>
        <div className="field">
          <label htmlFor="review-text">Opinia</label>
          <textarea className="textarea" id="review-text" name="text" maxLength={2000} style={{ minHeight: 100 }}
            placeholder="Jak wyszedł wydruk? Pasowanie, wykończenie, pakowanie, kontakt z drukarzem…" />
        </div>
        <div className="field">
          <span className="label">Zdjęcia wydruku</span>
          <ImageAttach name="photos" blob={blob} userId={userId} max={8} label="Dodaj zdjęcia wydruku" onBusy={setBusy} />
        </div>
        {state?.error && <div className="alert" role="alert">{state.error}</div>}
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <Submit className="btn btn-primary" pendingText="Zapisywanie…" disabled={busy}>Opublikuj ocenę</Submit>
        </div>
      </div>
    </form>
  );
}
