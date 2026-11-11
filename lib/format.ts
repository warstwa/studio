import type { EventType, RequestStatus } from "./types";

export const STATUS: Record<RequestStatus, { label: string; tone: "wait" | "go" | "help" | "done" | "stop" | "mute" }> = {
  draft: { label: "Szkic", tone: "mute" },
  open: { label: "Zbiera oferty", tone: "help" },
  pending: { label: "Czeka na decyzję", tone: "wait" },
  help_requested: { label: "Szuka pomocy", tone: "help" },
  accepted: { label: "Przyjęte", tone: "go" },
  printing: { label: "W druku", tone: "go" },
  ready: { label: "Gotowe / wysłane", tone: "done" },
  completed: { label: "Zakończone", tone: "mute" },
  rejected: { label: "Odrzucone", tone: "stop" },
  cancelled: { label: "Anulowane", tone: "mute" },
};

export const EVENT_LABEL: Record<EventType, string> = {
  published: "opublikował(a) zlecenie",
  offer: "złożył(a) ofertę",
  offer_accepted: "przyjął/przyjęła ofertę",
  created: "utworzył(a) zapytanie",
  accepted: "przyjął/przyjęła zlecenie",
  rejected: "odrzucił(a) zapytanie",
  help_asked: "poprosił(a) o pomoc",
  help_accepted: "dołączył(a) do realizacji",
  help_rejected: "odrzucił(a) prośbę o pomoc",
  printing: "rozpoczął/rozpoczęła druk",
  ready: "oznaczył(a) jako gotowe",
  completed: "potwierdził(a) odbiór",
  cancelled: "anulował(a)",
  reassigned: "przekierował(a) zapytanie",
  comment: "napisał(a)",
};

export function ago(ms: number) {
  const s = Math.max(1, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return "przed chwilą";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min temu`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} godz. temu`;
  const d = Math.round(h / 24);
  if (d < 30) return d === 1 ? "wczoraj" : `${d} dni temu`;
  return new Date(ms).toLocaleDateString("pl-PL");
}

export function date(d?: string) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" });
}

export function zl(n?: number) {
  return n == null ? "—" : `${n.toLocaleString("pl-PL")} zł`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function duration(sec: number) {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${String(m % 60).padStart(2, "0")} min`;
}

export function bytes(n: number) {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
