"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  DEMO_IDS,
  clearRateLimit,
  clientIp,
  currentUser,
  demoLoginEnabled,
  endAllSessions,
  endSession,
  hashPassword,
  rateLimited,
  safeNext,
  startSession,
  verifyPassword,
} from "@/lib/auth";
import { burnTime, needsRehash, passwordProblem } from "@/lib/password";
import * as D from "@/lib/data";
import { MATERIALS, type Attachment, type SlicerSummary } from "@/lib/types";
import { parseAttachments } from "@/lib/files";

export type FormState = { error?: string; ok?: string } | undefined;

const str = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);
const num = (f: FormData, k: string) => {
  const v = Number(String(f.get(k) ?? "").replace(",", "."));
  return Number.isFinite(v) && v > 0 ? v : undefined;
};

async function requireUser(next = "/panel") {
  const u = await currentUser();
  if (!u) redirect(`/logowanie?next=${encodeURIComponent(safeNext(next))}`);
  return u;
}

function fail(e: unknown): FormState {
  if (e instanceof D.DomainError) return { error: e.message };
  if (e && typeof e === "object" && "digest" in e) throw e; // redirect / notFound
  console.error(e);
  return { error: "Coś poszło nie tak. Spróbuj ponownie." };
}

/* ───────── auth ───────── */

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

export async function loginAction(_: FormState, f: FormData): Promise<FormState> {
  const email = str(f, "email", 120).toLowerCase();
  const pw = String(f.get("password") ?? "").slice(0, 200);
  const next = safeNext(str(f, "next", 300));
  if (!email || !pw) return { error: "Podaj e-mail i hasło." };

  const ip = await clientIp();
  if ((await rateLimited(`login:ip:${ip}`, 30, 15 * 60)) || (await rateLimited(`login:email:${email}`, 8, 15 * 60)))
    return { error: "Zbyt wiele prób logowania. Odczekaj 15 minut i spróbuj ponownie." };

  const u = await D.getUserByEmail(email);
  if (!u) {
    burnTime(pw);
    return { error: "Nieprawidłowy e-mail lub hasło." };
  }
  if (!verifyPassword(pw, u.passHash)) return { error: "Nieprawidłowy e-mail lub hasło." };

  if (needsRehash(u.passHash)) {
    u.passHash = hashPassword(pw);
    await D.saveUser(u);
  }
  await clearRateLimit(`login:email:${email}`);
  await startSession(u.id);
  redirect(next);
}

export async function demoLoginAction(f: FormData) {
  if (!demoLoginEnabled()) return;
  const id = str(f, "id");
  if (!DEMO_IDS.includes(id)) return;
  const u = await D.getUser(id);
  if (!u) return;
  await startSession(u.id);
  redirect("/panel");
}

export async function registerAction(_: FormState, f: FormData): Promise<FormState> {
  const name = str(f, "name", 60).replace(/\s+/g, " ");
  const email = str(f, "email", 120).toLowerCase();
  const pw = String(f.get("password") ?? "");
  const pw2 = String(f.get("password2") ?? "");
  const city = str(f, "city", 60);
  const role = str(f, "role") === "maker" ? "maker" : "client";
  if (name.length < 2) return { error: "Podaj imię i nazwisko." };
  if (!EMAIL_RE.test(email)) return { error: "Podaj poprawny adres e-mail." };
  const problem = passwordProblem(pw, { email, name });
  if (problem) return { error: problem };
  if (pw !== pw2) return { error: "Hasła nie są identyczne." };
  if (f.get("terms") !== "on") return { error: "Zaakceptuj regulamin, aby założyć konto." };

  const ip = await clientIp();
  if (await rateLimited(`register:ip:${ip}`, 10, 60 * 60))
    return { error: "Zbyt wiele nowych kont z tego adresu. Spróbuj ponownie za godzinę." };

  try {
    const u = await D.createUser({ name, email, passHash: hashPassword(pw), role, city: city || "Polska" });
    await startSession(u.id);
  } catch (e) {
    return fail(e);
  }
  redirect(role === "maker" ? "/profil?nowy=1" : "/drukarze");
}

export async function logoutAction() {
  await endSession();
  redirect("/");
}

export async function changePasswordAction(_: FormState, f: FormData): Promise<FormState> {
  const u = await requireUser("/profil");
  if (DEMO_IDS.includes(u.id)) return { error: "Hasła kont demonstracyjnych nie można zmieniać." };
  const cur = String(f.get("current") ?? "");
  const pw = String(f.get("password") ?? "");
  const pw2 = String(f.get("password2") ?? "");
  if (await rateLimited(`pwchange:${u.id}`, 10, 15 * 60)) return { error: "Zbyt wiele prób. Odczekaj chwilę." };
  if (!verifyPassword(cur, u.passHash)) return { error: "Obecne hasło jest nieprawidłowe." };
  const problem = passwordProblem(pw, { email: u.email, name: u.name });
  if (problem) return { error: problem };
  if (pw !== pw2) return { error: "Nowe hasła nie są identyczne." };
  if (pw === cur) return { error: "Nowe hasło musi różnić się od obecnego." };
  u.passHash = hashPassword(pw);
  await D.saveUser(u);
  // unieważnij wszystkie sesje (także na innych urządzeniach) i zaloguj ponownie tutaj
  await endAllSessions(u.id);
  await startSession(u.id);
  return { ok: "Hasło zmienione. Wylogowaliśmy Cię ze wszystkich innych urządzeń." };
}

export async function logoutEverywhereAction() {
  const u = await requireUser("/profil");
  await endAllSessions(u.id);
  await endSession();
  redirect("/logowanie?wylogowano=1");
}

/* ───────── profil drukarza ───────── */

export async function saveProfileAction(_: FormState, f: FormData): Promise<FormState> {
  const u = await requireUser("/profil");
  u.name = str(f, "name", 60) || u.name;
  u.city = str(f, "city", 60);
  u.bio = str(f, "bio", 600);
  const becomeMaker = f.get("isMaker") === "on";
  if (becomeMaker) {
    const prev = u.maker;
    u.role = "maker";
    u.maker = {
      headline: str(f, "headline", 80) || "Drukarz w sieci Warstwa",
      printers: str(f, "printers", 400).split(/\n|,/).map((s) => s.trim()).filter(Boolean).slice(0, 8),
      materials: f.getAll("materials").map(String).filter((m) => (MATERIALS as readonly string[]).includes(m)),
      buildVolume: str(f, "buildVolume", 40),
      hourlyRate: num(f, "hourlyRate") ?? 15,
      leadDays: Math.round(num(f, "leadDays") ?? 3),
      available: f.get("available") === "on",
      rating: prev?.rating ?? 0,
      jobsDone: prev?.jobsDone ?? 0,
    };
  } else {
    u.role = "client";
  }
  await D.saveUser(u);
  revalidatePath("/", "layout");
  return { ok: "Zapisano profil." };
}

/* ───────── zapytania ───────── */

export async function createRequestAction(_: FormState, f: FormData): Promise<FormState> {
  const makerId = str(f, "makerId");
  const u = await requireUser(`/zapytania/nowe?drukarz=${makerId}`);
  const title = str(f, "title", 120);
  const description = str(f, "description", 3000);
  const material = str(f, "material", 40);
  if (title.length < 4) return { error: "Nadaj zleceniu krótki tytuł (min. 4 znaki)." };
  if (description.length < 10) return { error: "Opisz, czego potrzebujesz (min. 10 znaków)." };
  if (!material) return { error: "Wybierz materiał." };
  const fileUrl = str(f, "fileUrl", 500);
  if (fileUrl && !/^https?:\/\//.test(fileUrl)) return { error: "Link do pliku musi zaczynać się od http(s)://" };
  let id: string;
  try {
    const r = await D.createRequest(u, {
      title,
      description,
      makerId,
      material,
      color: str(f, "color", 40) || "Dowolny",
      quantity: Math.round(num(f, "quantity") ?? 1),
      dims: str(f, "dims", 60) || "—",
      infill: Math.min(100, Math.round(num(f, "infill") ?? 20)),
      layerHeight: num(f, "layerHeight") ?? 0.2,
      deadline: str(f, "deadline", 10) || undefined,
      budget: num(f, "budget"),
      fileUrl: fileUrl || undefined,
    });
    id = r.id;
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/panel");
  redirect(`/zapytania/${id}?wyslano=1`);
}

async function run(id: string, fn: () => Promise<unknown>): Promise<FormState> {
  try {
    await fn();
  } catch (e) {
    return fail(e);
  }
  revalidatePath(`/zapytania/${id}`);
  revalidatePath("/panel");
  revalidatePath("/zlecenia");
  return { ok: "ok" };
}

export async function decideAction(_: FormState, f: FormData): Promise<FormState> {
  const id = str(f, "id");
  const u = await requireUser(`/zapytania/${id}`);
  const decision = str(f, "decision");
  const note = str(f, "note", 1000);
  if (decision === "accept")
    return run(id, () => D.acceptRequest(id, u, num(f, "quote"), str(f, "eta", 10) || undefined, note));
  if (decision === "reject") return run(id, () => D.rejectRequest(id, u, note));
  if (decision === "help") {
    const helperId = str(f, "helperId");
    if (!helperId) return { error: "Wybierz drukarza, którego poprosisz o pomoc." };
    return run(id, () => D.askForHelp(id, u, helperId, Math.round(num(f, "quantity") ?? 0), note));
  }
  return { error: "Nieznana akcja." };
}

export async function advanceAction(_: FormState, f: FormData): Promise<FormState> {
  const id = str(f, "id");
  const u = await requireUser(`/zapytania/${id}`);
  return run(id, () => D.advanceRequest(id, u, str(f, "note", 1000)));
}

export async function completeAction(_: FormState, f: FormData): Promise<FormState> {
  const id = str(f, "id");
  const u = await requireUser(`/zapytania/${id}`);
  return run(id, () => D.completeRequest(id, u));
}

export async function cancelAction(_: FormState, f: FormData): Promise<FormState> {
  const id = str(f, "id");
  const u = await requireUser(`/zapytania/${id}`);
  return run(id, () => D.cancelRequest(id, u));
}

export async function reassignAction(_: FormState, f: FormData): Promise<FormState> {
  const id = str(f, "id");
  const u = await requireUser(`/zapytania/${id}`);
  return run(id, () => D.reassignRequest(id, u, str(f, "makerId")));
}

export async function commentAction(_: FormState, f: FormData): Promise<FormState> {
  const id = str(f, "id");
  const u = await requireUser(`/zapytania/${id}`);
  return run(id, () => D.addComment(id, u, str(f, "text", 2000)));
}

/* ───────── zamówienia: szkic → giełda → oferty ───────── */

function orderFields(f: FormData): D.DraftInput {
  const material = str(f, "material", 40);
  const delivery = str(f, "delivery");
  const deadline = str(f, "deadline", 10);
  return {
    title: str(f, "title", 120) || undefined,
    description: f.has("description") ? str(f, "description", 4000) : undefined,
    material: (MATERIALS as readonly string[]).includes(material) ? material : undefined,
    color: str(f, "color", 40) || undefined,
    quantity: f.has("quantity") ? Math.min(10000, Math.round(num(f, "quantity") ?? 1)) : undefined,
    dims: str(f, "dims", 60) || undefined,
    infill: f.has("infill") ? Math.min(100, Math.max(0, Math.round(Number(f.get("infill")) || 0))) : undefined,
    layerHeight: num(f, "layerHeight"),
    deadline: /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? deadline : undefined,
    budget: f.has("budget") ? num(f, "budget") ?? 0 : undefined,
    delivery: delivery === "pickup" ? "pickup" : delivery === "shipping" ? "shipping" : undefined,
    city: str(f, "city", 60) || undefined,
    files: f.has("files") ? parseAttachments(f.get("files")) : undefined,
  };
}

/** Start zamówienia: plik(i) albo pomysł → szkic do uzupełnienia. */
export async function startOrderAction(_: FormState, f: FormData): Promise<FormState> {
  const u = await requireUser("/zamow");
  const kind = str(f, "kind") === "idea" ? "idea" : "file";
  const input = orderFields(f);
  if (kind === "file" && !input.files?.length) return { error: "Dodaj co najmniej jeden plik modelu." };
  if (kind === "idea" && (input.description ?? "").length < 20) return { error: "Opisz pomysł w kilku zdaniach (min. 20 znaków)." };
  const r = await D.createDraft(u, kind, input);
  redirect(`/zamow/${r.id}`);
}

/** Wywoływane przez slicer po kliknięciu „Dodaj do zamówienia”. */
export async function slicerOrderAction(payload: { slicer: SlicerSummary; files: Attachment[] }): Promise<{ id?: string; error?: string }> {
  const u = await currentUser();
  if (!u) return { error: "Zaloguj się, aby dodać do zamówienia." };
  const s = payload?.slicer;
  if (!s || typeof s.seconds !== "number" || !Array.isArray(s.filaments)) return { error: "Brak danych z kalkulatora." };
  const clean: SlicerSummary = {
    modelName: String(s.modelName ?? "model").slice(0, 160),
    seconds: Math.max(0, +s.seconds || 0),
    grams: Math.max(0, +s.grams || 0),
    meters: Math.max(0, +s.meters || 0),
    plates: Math.max(1, Math.round(+s.plates || 1)),
    changes: Math.max(0, Math.round(+s.changes || 0)),
    quantity: Math.max(1, Math.min(10000, Math.round(+s.quantity || 1))),
    layerHeight: +s.layerHeight || 0.2,
    infill: Math.max(0, Math.min(100, +s.infill || 0)),
    walls: Math.max(1, Math.min(10, Math.round(+s.walls || 2))),
    supports: String(s.supports ?? "none").slice(0, 20),
    profile: String(s.profile ?? "").slice(0, 20),
    size: Array.isArray(s.size) && s.size.length === 3 ? (s.size.map((v) => +v || 0) as [number, number, number]) : undefined,
    filaments: s.filaments.slice(0, 16).map((x) => ({
      label: String(x.label ?? "").slice(0, 40),
      color: /^#[0-9a-f]{6}$/i.test(x.color) ? x.color : "#888888",
      material: String(x.material ?? "PLA").slice(0, 20),
      grams: Math.max(0, +x.grams || 0),
    })),
  };
  const r = await D.createDraft(u, "slicer", { slicer: clean, files: parseAttachments(payload.files) });
  return { id: r.id };
}

/** Zapis szkicu / edycja zlecenia; intent=publish wysyła je na giełdę. */
export async function saveOrderAction(_: FormState, f: FormData): Promise<FormState> {
  const id = str(f, "id");
  const u = await requireUser(`/zamow/${id}`);
  const intent = str(f, "intent");
  try {
    await D.updateOrder(id, u, orderFields(f));
    if (intent === "publish") await D.publishOrder(id, u);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/zlecenia");
  revalidatePath("/panel");
  revalidatePath(`/zamow/${id}`);
  if (intent === "publish") redirect(`/zapytania/${id}?opublikowano=1`);
  if (intent === "done") redirect(`/zapytania/${id}`);
  return { ok: "Zapisano." };
}

export async function offerAction(_: FormState, f: FormData): Promise<FormState> {
  const id = str(f, "id");
  const u = await requireUser(`/zapytania/${id}`);
  return run(id, () => D.submitOffer(id, u, { price: num(f, "price") ?? 0, eta: str(f, "eta", 10), note: str(f, "note", 1000) }));
}

export async function withdrawOfferAction(_: FormState, f: FormData): Promise<FormState> {
  const id = str(f, "id");
  const u = await requireUser(`/zapytania/${id}`);
  return run(id, () => D.withdrawOffer(id, u));
}

export async function acceptOfferAction(_: FormState, f: FormData): Promise<FormState> {
  const id = str(f, "id");
  const u = await requireUser(`/zapytania/${id}`);
  return run(id, () => D.acceptOffer(id, u, str(f, "makerId")));
}

export async function deleteOrderAction(_: FormState, f: FormData): Promise<FormState> {
  const id = str(f, "id");
  const u = await requireUser(`/zamow/${id}`);
  try {
    await D.cancelRequest(id, u);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/zlecenia");
  redirect("/panel?widok=zamowienia");
}
