import type { PrintRequest, User } from "./types";

/**
 * Dopasowanie drukarzy do zlecenia („best fit”).
 * Czysta funkcja — bez dostępu do bazy, łatwa do testowania.
 * Wynik 0–100 + krótkie powody widoczne dla zamawiającego i drukarza.
 */

export interface Fit {
  makerId: string;
  score: number; // 0–100
  reasons: string[]; // plusy
  warnings: string[]; // minusy
}

type Req = Pick<PrintRequest, "material" | "quantity" | "dims" | "deadline" | "slicer">;

const MULTI_RE = /\b(AMS|MMU|XL|INDX|toolchanger|tool changer|\dT)\b|wielokolor/i;
const DAY = 86_400_000;

/** Liczby z napisu wymiarów, np. "120 × 80 × 40 mm" → [120, 80, 40]. */
function nums(s?: string) {
  return (s?.match(/\d+(?:[.,]\d+)?/g) ?? []).map((v) => parseFloat(v.replace(",", "."))).filter((v) => v > 0);
}

function fits(part: number[], volume: number[]) {
  if (part.length < 3 || volume.length < 3) return null;
  const a = [...part].sort((x, y) => y - x);
  const b = [...volume].sort((x, y) => y - x);
  return a.every((v, i) => v <= b[i]);
}

export function scoreMaker(r: Req, u: User, now = Date.now()): Fit | null {
  const m = u.maker;
  if (!m) return null;
  let s = 40;
  const reasons: string[] = [];
  const warnings: string[] = [];

  // materiał(y) — z formularza albo z filamentów w slicerze
  const wanted = new Set<string>([r.material, ...(r.slicer?.filaments.map((f) => f.material) ?? [])].filter(Boolean));
  const missing = [...wanted].filter((w) => !m.materials.some((x) => x.toLowerCase() === w.toLowerCase()));
  if (missing.length === 0) {
    s += 22;
    reasons.push(`Drukuje w ${[...wanted].join(", ")}`);
  } else {
    s -= 30;
    warnings.push(`Brak w ofercie: ${missing.join(", ")}`);
  }

  // wielokolor
  const colors = r.slicer?.filaments.length ?? 1;
  if (colors > 1) {
    if (m.printers.some((p) => MULTI_RE.test(p))) {
      s += 10;
      reasons.push("Ma drukarkę wielokolorową");
    } else {
      s -= 12;
      warnings.push(`Zlecenie ma ${colors} kolory — brak AMS/MMU`);
    }
  }

  // dostępność
  if (m.available) {
    s += 8;
    reasons.push("Przyjmuje zlecenia");
  } else {
    s -= 20;
    warnings.push("Chwilowo zajęty");
  }

  // termin
  if (r.deadline) {
    const days = Math.ceil((new Date(r.deadline + "T23:59:59").getTime() - now) / DAY);
    if (m.leadDays <= days) {
      s += 8;
      reasons.push(`Zdąży (zwykle ~${m.leadDays} dni)`);
    } else {
      s -= 12;
      warnings.push(`Zwykle potrzebuje ~${m.leadDays} dni`);
    }
  }

  // rozmiar
  const part = r.slicer?.size ?? nums(r.dims);
  const f = fits(part as number[], nums(m.buildVolume));
  if (f === true) s += 4;
  if (f === false) {
    s -= 25;
    warnings.push(`Pole robocze ${m.buildVolume} może być za małe`);
  }

  // seria — farmy (kilka maszyn) mają przewagę
  const machines = m.printers.reduce((a, p) => a + (Number(p.match(/[×x]\s*(\d+)/)?.[1]) || 1), 0);
  if (r.quantity >= 20 && machines >= 3) {
    s += 5;
    reasons.push(`${machines} maszyny — szybka seria`);
  }

  // reputacja
  if (m.rating > 0) s += Math.max(-8, Math.min(8, (m.rating - 4.5) * 20));
  // szybkość realizacji — krótszy typowy czas to lepsze dopasowanie
  s += Math.max(0, 6 - m.leadDays);
  s += Math.min(5, Math.log10(m.jobsDone + 1) * 2);
  if (m.rating >= 4.85 && m.jobsDone >= 50) reasons.push(`★ ${m.rating.toFixed(2)} · ${m.jobsDone} zleceń`);

  return { makerId: u.id, score: Math.max(0, Math.min(100, Math.round(s))), reasons, warnings };
}

export function bestFit(r: Req, makers: User[], exclude: string[] = [], now = Date.now()): Fit[] {
  return makers
    .filter((u) => u.maker && !exclude.includes(u.id))
    .map((u) => scoreMaker(r, u, now)!)
    .sort((a, b) => b.score - a.score);
}
