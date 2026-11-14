"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { changePasswordAction, deleteAccountAction, logoutAction, logoutEverywhereAction } from "@/app/actions";
import Submit from "@/components/Submit";
import PasswordInput from "@/components/PasswordInput";

function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(deleteAccountAction, undefined);
  const [confirm, setConfirm] = useState("");
  return (
    <div className="danger-zone">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <b>Usuń konto</b>
          <p className="muted" style={{ fontSize: 14, marginTop: 2 }}>Trwale usuwa Twoje dane osobowe. Tej operacji nie da się cofnąć.</p>
        </div>
        {!open && <button type="button" className="btn btn-stop" onClick={() => setOpen(true)}>Usuń konto…</button>}
      </div>
      {open && (
        <form action={action} className="form" style={{ marginTop: 16 }}>
          <ul className="danger-list">
            <li>usuniemy Twoje imię i nazwisko, e-mail, hasło, opis, zdjęcie profilowe i galerię realizacji;</li>
            <li>szkice i zlecenia czekające na oferty zostaną anulowane, a Twoje oferty — wycofane;</li>
            <li>w historii zakończonych zleceń i w opiniach zostanie „Usunięte konto” — druga strona zachowa swoją historię;</li>
            <li>jeśli masz zlecenia w realizacji, najpierw je zakończ albo uzgodnij anulowanie.</li>
          </ul>
          <PasswordInput id="delete-password" name="password" label="Hasło" autoComplete="current-password" />
          <div className="field">
            <label htmlFor="delete-confirm">Wpisz USUŃ, aby potwierdzić</label>
            <input className="input" id="delete-confirm" name="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
          </div>
          {state?.error && <div className="alert" role="alert">{state.error}</div>}
          <div className="row">
            <Submit className="btn btn-stop" pendingText="Usuwanie…" disabled={confirm.trim().toUpperCase() !== "USUŃ"}>Usuń konto na stałe</Submit>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Anuluj</button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function SecurityPanel({ isDemo }: { isDemo: boolean }) {
  const [state, action] = useActionState(changePasswordAction, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <div className="panel" id="bezpieczenstwo">
      <div className="panel-head"><span className="mono">Bezpieczeństwo</span></div>
      <div className="panel-body stack">
        {isDemo ? (
          <div className="banner warn">To wspólne konto demonstracyjne — zmiana hasła jest wyłączona.</div>
        ) : (
          <form ref={ref} action={action} className="form" key={state?.ok ? "ok" : "form"}>
            <PasswordInput id="current" name="current" label="Obecne hasło" autoComplete="current-password" />
            <div className="form-grid">
              <PasswordInput id="new-password" name="password" label="Nowe hasło" autoComplete="new-password" meter />
              <PasswordInput id="new-password2" name="password2" label="Powtórz nowe hasło" autoComplete="new-password" />
            </div>
            {state?.error && <div className="alert" role="alert">{state.error}</div>}
            {state?.ok && <div className="alert ok" role="status">{state.ok}</div>}
            <div><Submit className="btn" pendingText="Zapisywanie…">Zmień hasło</Submit></div>
          </form>
        )}
        <div className="row" style={{ borderTop: "1px solid var(--line)", paddingTop: 20 }}>
          <form action={logoutAction}><Submit className="btn btn-ghost" pendingText="…">Wyloguj</Submit></form>
          <form action={logoutEverywhereAction}><Submit className="btn btn-stop" pendingText="…">Wyloguj ze wszystkich urządzeń</Submit></form>
        </div>
        {!isDemo && <DeleteAccount />}
      </div>
    </div>
  );
}
