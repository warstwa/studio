"use client";
import { useActionState, useEffect, useRef } from "react";
import { changePasswordAction, logoutAction, logoutEverywhereAction } from "@/app/actions";
import Submit from "@/components/Submit";
import PasswordInput from "@/components/PasswordInput";

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
      </div>
    </div>
  );
}
