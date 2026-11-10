"use client";
import { useActionState, useState } from "react";
import { loginAction } from "@/app/actions";
import Submit from "@/components/Submit";
import PasswordInput from "@/components/PasswordInput";

export default function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, undefined);
  // pola kontrolowane — React 19 czyści formularz po akcji, a e-mail ma zostać po błędzie
  const [email, setEmail] = useState("");
  return (
    <form action={action} className="form">
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <PasswordInput id="password" name="password" label="Hasło" autoComplete="current-password" />
      {state?.error && <div className="alert" role="alert">{state.error}</div>}
      <Submit className="btn btn-primary btn-lg" pendingText="Logowanie…">Zaloguj się</Submit>
    </form>
  );
}
