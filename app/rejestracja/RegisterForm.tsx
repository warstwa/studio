"use client";
import { useActionState, useState } from "react";
import { registerAction } from "@/app/actions";
import Submit from "@/components/Submit";
import PasswordInput from "@/components/PasswordInput";

export default function RegisterForm({ defaultRole }: { defaultRole: "client" | "maker" }) {
  const [state, action] = useActionState(registerAction, undefined);
  // pola kontrolowane — po błędzie walidacji nic nie znika z formularza
  const [v, setV] = useState({ role: defaultRole as string, name: "", city: "", email: "", terms: false });
  const bind = (k: "name" | "city" | "email") => ({ value: v[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value }) });
  return (
    <form action={action} className="form">
      <div className="seg" role="radiogroup" aria-label="Typ konta">
        <label>
          <input type="radio" name="role" value="client" checked={v.role === "client"} onChange={() => setV({ ...v, role: "client" })} />
          <b>Zamawiam</b>
          <span>Szukam kogoś do druku</span>
        </label>
        <label>
          <input type="radio" name="role" value="maker" checked={v.role === "maker"} onChange={() => setV({ ...v, role: "maker" })} />
          <b>Drukuję</b>
          <span>Mam drukarkę i przyjmuję zlecenia</span>
        </label>
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="name">Imię i nazwisko</label>
          <input className="input" id="name" name="name" autoComplete="name" required maxLength={60} {...bind("name")} />
        </div>
        <div className="field">
          <label htmlFor="city">Miasto</label>
          <input className="input" id="city" name="city" autoComplete="address-level2" maxLength={60} {...bind("city")} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required maxLength={120} {...bind("email")} />
      </div>
      <PasswordInput id="password" name="password" label="Hasło" autoComplete="new-password" meter />
      <PasswordInput id="password2" name="password2" label="Powtórz hasło" autoComplete="new-password" />
      <label className="check">
        <input type="checkbox" name="terms" required checked={v.terms} onChange={(e) => setV({ ...v, terms: e.target.checked })} />
        <span>
          Akceptuję <a href="/regulamin" target="_blank" className="accent">Regulamin</a> i zapoznałem(-am) się z{" "}
          <a href="/polityka-prywatnosci" target="_blank" className="accent">Polityką prywatności</a>.
        </span>
      </label>
      {state?.error && <div className="alert" role="alert">{state.error}</div>}
      <Submit className="btn btn-primary btn-lg" pendingText="Tworzenie konta…">Załóż konto</Submit>
    </form>
  );
}
