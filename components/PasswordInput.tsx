"use client";
import { useState } from "react";

function score(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-ząćęłńóśźż]/.test(pw) && /[A-ZĄĆĘŁŃÓŚŹŻ]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^\p{L}\d]/u.test(pw)) s++;
  return Math.min(4, s);
}
const LABEL = ["Za krótkie", "Słabe", "Średnie", "Dobre", "Silne"];

export default function PasswordInput({
  id,
  name,
  autoComplete,
  meter = false,
  label,
}: {
  id: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  meter?: boolean;
  label: string;
}) {
  const [show, setShow] = useState(false);
  const [val, setVal] = useState("");
  const s = score(val);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="pw-wrap">
        <input
          className="input"
          id={id}
          name={name}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={autoComplete === "new-password" ? 8 : undefined}
          maxLength={128}
          value={val}
          onChange={(e) => setVal(e.target.value)}
        />
        <button type="button" className="pw-toggle mono" onClick={() => setShow(!show)} aria-label={show ? "Ukryj hasło" : "Pokaż hasło"} aria-pressed={show}>
          {show ? "Ukryj" : "Pokaż"}
        </button>
      </div>
      {meter && (
        <div className="pw-meter" data-s={val ? s : -1} aria-live="polite">
          <span><i /><i /><i /><i /></span>
          <small>{val ? LABEL[s] : "Min. 8 znaków, litera i cyfra"}</small>
        </div>
      )}
    </div>
  );
}
