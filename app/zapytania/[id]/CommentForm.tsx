"use client";
import { useActionState, useEffect, useState } from "react";
import { commentAction } from "@/app/actions";
import Submit from "@/components/Submit";
import ImageAttach from "@/components/ImageAttach";

export default function CommentForm({ id, blob, userId }: { id: string; blob: boolean; userId: string }) {
  const [state, action] = useActionState(commentAction, undefined);
  const [round, setRound] = useState(0);
  const [busy, setBusy] = useState(false);
  // po wysłaniu czyścimy formularz razem ze zdjęciami (nowy klucz = świeży stan)
  useEffect(() => {
    if (state?.ok) setRound((r) => r + 1);
  }, [state]);
  return (
    <form key={round} action={action} className="decide chat-form">
      <input type="hidden" name="id" value={id} />
      <textarea className="textarea" name="text" placeholder="Napisz wiadomość do uczestników zlecenia…" style={{ minHeight: 80 }} aria-label="Wiadomość" />
      <div className="chat-actions">
        <ImageAttach name="images" blob={blob} userId={userId} max={8} label="Dodaj zdjęcia" onBusy={setBusy} />
        <div className="row" style={{ marginLeft: "auto" }}>
          {state?.error && <span className="alert" role="alert">{state.error}</span>}
          <Submit className="btn btn-sm" pendingText="Wysyłanie…" disabled={busy}>Wyślij wiadomość</Submit>
        </div>
      </div>
    </form>
  );
}
