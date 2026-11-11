"use client";
import { useState } from "react";

/** Wybór oceny 1–5 (klawiatura: radio). */
export function StarsInput({ name, label }: { name: string; label: string }) {
  const [v, setV] = useState(0);
  const [hover, setHover] = useState(0);
  const LABELS = ["", "Słabo", "Przeciętnie", "Dobrze", "Bardzo dobrze", "Świetnie"];
  return (
    <fieldset className="stars-input">
      <legend className="label">{label}</legend>
      <div className="stars-row" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <label key={i} className={i <= (hover || v) ? "on" : ""} onMouseEnter={() => setHover(i)}>
            <input type="radio" name={name} value={i} checked={v === i} onChange={() => setV(i)} aria-label={`${i} z 5`} />
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" /></svg>
          </label>
        ))}
        <span className="stars-label">{LABELS[hover || v]}</span>
      </div>
    </fieldset>
  );
}
