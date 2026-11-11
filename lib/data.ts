import "server-only";
import { randomBytes } from "node:crypto";
import { kv } from "./kv";
import { hashPassword } from "./password";
import { bestFit } from "./match";
import type {
  Attachment,
  EventType,
  Offer,
  SlicerSummary,
  MakerProfile,
  PrintRequest,
  PublicUser,
  RequestStatus,
  User,
} from "./types";

const uid = (n = 10) => randomBytes(n).toString("base64url").slice(0, n);

export class DomainError extends Error {}

/* ───────────────────────── seed ───────────────────────── */

const DAY = 86_400_000;
const gs = globalThis as unknown as { __warstwaSeeded?: boolean };

async function ensureSeeded() {
  if (gs.__warstwaSeeded) return;
  const db = kv();
  if (await db.setnx("seeded:v1", Date.now())) await seedV1();
  if (await db.setnx("seeded:v2", Date.now())) await seedV2();
  gs.__warstwaSeeded = true;
}

async function seedV1() {
  const db = kv();
  const pw = hashPassword("demo1234");
  const now = Date.now();
  const mk = (
    id: string,
    name: string,
    email: string,
    city: string,
    bio: string,
    maker?: MakerProfile,
  ): User => ({
    id,
    name,
    email,
    passHash: pw,
    role: maker ? "maker" : "client",
    city,
    bio,
    createdAt: now - 120 * DAY,
    maker,
  });

  const users: User[] = [
    mk("u_kuba", "Kuba Wrona", "kuba@warstwa.pl", "Kraków",
      "Inżynier mechanik. Drukuję części funkcjonalne, które mają pasować za pierwszym razem — tolerancje ±0,1 mm.",
      { headline: "Precyzyjne części techniczne", printers: ["Bambu Lab X1 Carbon", "Prusa MK4S"], materials: ["PLA", "PETG", "ABS", "ASA", "PA-CF"], buildVolume: "256 × 256 × 256 mm", hourlyRate: 18, leadDays: 3, available: true, rating: 4.9, jobsDone: 214 }),
    mk("u_ola", "Ola Szymańska", "ola@warstwa.pl", "Warszawa",
      "Druk żywiczny w 12K. Figurki, biżuteria, modele dentystyczne. Każdy wydruk myty i utwardzany UV.",
      { headline: "Figurki i druk żywiczny 12K", printers: ["Elegoo Saturn 4 Ultra", "Formlabs Form 3+"], materials: ["Żywica standard", "Żywica twarda"], buildVolume: "218 × 123 × 220 mm", hourlyRate: 24, leadDays: 4, available: true, rating: 4.95, jobsDone: 132 }),
    mk("u_tomek", "Tomasz Lis", "tomek@warstwa.pl", "Gdańsk",
      "Duże formaty i serie. Pięć głowic w Prusie XL, więc wielokolor bez wieży czyszczącej.",
      { headline: "Duże formaty, krótkie serie", printers: ["Prusa XL 5T", "Creality K1 Max"], materials: ["PLA", "PETG", "TPU 95A"], buildVolume: "360 × 360 × 360 mm", hourlyRate: 15, leadDays: 2, available: true, rating: 4.8, jobsDone: 301 }),
    mk("u_marta", "Marta Kowal", "marta@warstwa.pl", "Wrocław",
      "Mała farma trzech P1S. Prototypy dla startupów i krótkie serie do 200 sztuk.",
      { headline: "Farma druku — serie do 200 szt.", printers: ["Bambu Lab P1S × 3"], materials: ["PLA", "PETG", "ABS", "ASA", "TPU 95A"], buildVolume: "256 × 256 × 256 mm", hourlyRate: 14, leadDays: 2, available: true, rating: 4.85, jobsDone: 176 }),
    mk("u_piotr", "Piotr Nowicki", "piotr@warstwa.pl", "Poznań",
      "Komora grzana, materiały inżynieryjne. Jeśli coś ma wytrzymać 100 °C — piszcie.",
      { headline: "Materiały inżynieryjne, komora grzana", printers: ["Voron 2.4 350"], materials: ["ABS", "ASA", "PC", "PA-CF"], buildVolume: "350 × 350 × 340 mm", hourlyRate: 22, leadDays: 5, available: false, rating: 4.7, jobsDone: 89 }),
    mk("u_ania", "Ania Zielińska", "ania@warstwa.pl", "Łódź",
      "Wielokolorowe wydruki dekoracyjne i gadżety. MMU3, do pięciu kolorów w jednym modelu.",
      { headline: "Wielokolor i gadżety", printers: ["Prusa MK4 + MMU3"], materials: ["PLA", "PLA Silk", "PETG"], buildVolume: "250 × 210 × 220 mm", hourlyRate: 16, leadDays: 3, available: true, rating: 4.9, jobsDone: 58 }),
    mk("u_jan", "Jan Nowak", "jan@warstwa.pl", "Warszawa", "Projektuję elektronikę hobbystycznie."),
  ];

  for (const u of users) {
    await db.set(`user:${u.id}`, u);
    await db.set(`email:${u.email}`, u.id);
    await db.sadd("users", u.id);
  }

  let ev = 0;
  const e = (at: number, actorId: string, type: EventType, note?: string, refId?: string) => ({
    id: `e${++ev}`, at, actorId, type, note, refId,
  });
  const base = {
    infill: 20, layerHeight: 0.2, participants: [] as string[], events: [] as PrintRequest["events"],
  };
  const reqs: PrintRequest[] = [
    {
      ...base, id: "r_rpi", code: "WR-1001", rootId: "r_rpi",
      title: "Obudowa do Raspberry Pi 5 z wentylatorem",
      description: "Dwuczęściowa obudowa na zatrzaski, otwór na wentylator 30 mm. Pliki STEP + STL w linku. Zależy mi na czystych otworach pod porty.",
      clientId: "u_jan", makerId: "u_kuba", participants: ["u_jan", "u_kuba"],
      material: "PETG", color: "Grafitowy", quantity: 2, dims: "96 × 66 × 32 mm", infill: 25, layerHeight: 0.16,
      deadline: iso(now + 9 * DAY), budget: 120, fileUrl: "https://www.printables.com/",
      status: "pending", createdAt: now - 3 * 3600_000, updatedAt: now - 3 * 3600_000,
      events: [e(now - 3 * 3600_000, "u_jan", "created")],
    },
    {
      ...base, id: "r_org", code: "WR-1002", rootId: "r_org",
      title: "Organizery do szuflad warsztatowych — seria",
      description: "Moduły Gridfinity 2×3 i 1×2. Łącznie 48 sztuk, dowolny ciemny kolor, byle jednolity w całej serii.",
      clientId: "u_jan", makerId: "u_tomek", participants: ["u_jan", "u_tomek", "u_marta"],
      material: "PLA", color: "Czarny mat", quantity: 48, dims: "84 × 126 × 42 mm", infill: 15, layerHeight: 0.24,
      deadline: iso(now + 6 * DAY), budget: 600, quote: 540, eta: iso(now + 5 * DAY),
      status: "printing", createdAt: now - 4 * DAY, updatedAt: now - 1 * DAY,
      events: [
        e(now - 4 * DAY, "u_jan", "created"),
        e(now - 3.8 * DAY, "u_tomek", "help_asked", "Seria 48 szt. — część oddam Marcie, żeby zdążyć przed terminem.", "r_org_h1"),
        e(now - 3.5 * DAY, "u_marta", "help_accepted", "Biorę 20 sztuk.", "r_org_h1"),
        e(now - 3.5 * DAY, "u_tomek", "accepted", "Realizacja wspólna z Martą. Wycena 540 zł."),
        e(now - 1 * DAY, "u_tomek", "printing"),
      ],
    },
    {
      ...base, id: "r_org_h1", code: "WR-1003", rootId: "r_org", parentId: "r_org", requestedById: "u_tomek",
      title: "Pomoc: Organizery do szuflad warsztatowych — seria",
      description: "Potrzebuję 20 z 48 sztuk. Ten sam filament (Czarny mat, partia przesłana kurierem).",
      clientId: "u_jan", makerId: "u_marta", participants: [],
      material: "PLA", color: "Czarny mat", quantity: 20, dims: "84 × 126 × 42 mm", infill: 15, layerHeight: 0.24,
      deadline: iso(now + 5 * DAY), quote: 220,
      status: "printing", createdAt: now - 3.8 * DAY, updatedAt: now - 2 * DAY,
      events: [
        e(now - 3.8 * DAY, "u_tomek", "created", "Prośba o pomoc przy zleceniu WR-1002."),
        e(now - 3.5 * DAY, "u_marta", "accepted", "Biorę 20 sztuk."),
        e(now - 2 * DAY, "u_marta", "printing"),
      ],
    },
    {
      ...base, id: "r_dragon", code: "WR-1004", rootId: "r_dragon",
      title: "Figurka smoka do malowania, skala 1:10",
      description: "Model z podziałem na 4 części, podpory od spodu. Do malowania aerografem, więc bez śladów po podporach na łuskach.",
      clientId: "u_jan", makerId: "u_ola", participants: ["u_jan", "u_ola"],
      material: "Żywica standard", color: "Szary", quantity: 1, dims: "180 × 140 × 160 mm", infill: 100, layerHeight: 0.05,
      budget: 200, quote: 185, eta: iso(now - 1 * DAY),
      status: "ready", createdAt: now - 8 * DAY, updatedAt: now - 1 * DAY,
      events: [
        e(now - 8 * DAY, "u_jan", "created"),
        e(now - 7.6 * DAY, "u_ola", "accepted", "Wycena 185 zł, wysyłka InPost."),
        e(now - 6 * DAY, "u_ola", "printing"),
        e(now - 1 * DAY, "u_ola", "ready", "Wysłane — numer paczki w wiadomości."),
      ],
    },
    {
      ...base, id: "r_cam", code: "WR-1005", rootId: "r_cam",
      title: "Uchwyt kamery do auta — poliwęglan",
      description: "Uchwyt na szybę, musi wytrzymać nagrzane auto latem.",
      clientId: "u_jan", makerId: "u_piotr", participants: ["u_jan", "u_piotr"],
      material: "PC", color: "Czarny", quantity: 1, dims: "70 × 45 × 60 mm", infill: 40, layerHeight: 0.2,
      status: "rejected", createdAt: now - 2 * DAY, updatedAt: now - 1.5 * DAY,
      events: [
        e(now - 2 * DAY, "u_jan", "created"),
        e(now - 1.5 * DAY, "u_piotr", "rejected", "Maszyna zajęta do 20.11 — polecam Kubę, ma PC w ofercie."),
      ],
    },
    {
      ...base, id: "r_gear", code: "WR-1006", rootId: "r_gear",
      title: "Zestaw zębatek do ramienia robota",
      description: "12 kół zębatych moduł 1, PA-CF. Część z nich wymaga dokładnej średnicy otworu 5 mm pod wałek.",
      clientId: "u_ania", makerId: "u_kuba", participants: ["u_ania", "u_kuba", "u_tomek"],
      material: "PA-CF", color: "Czarny", quantity: 12, dims: "60 × 60 × 10 mm", infill: 60, layerHeight: 0.12,
      deadline: iso(now + 12 * DAY), budget: 300,
      status: "help_requested", createdAt: now - 1 * DAY, updatedAt: now - 20 * 3600_000,
      events: [
        e(now - 1 * DAY, "u_ania", "created"),
        e(now - 20 * 3600_000, "u_kuba", "help_asked", "Wezmę 6, szukam kogoś na pozostałe 6.", "r_gear_h1"),
      ],
    },
    {
      ...base, id: "r_gear_h1", code: "WR-1007", rootId: "r_gear", parentId: "r_gear", requestedById: "u_kuba",
      title: "Pomoc: Zestaw zębatek do ramienia robota",
      description: "Potrzebuję 6 z 12 sztuk w PA-CF. Tolerancja otworu 5 mm H7 — mogę podesłać profil.",
      clientId: "u_ania", makerId: "u_tomek",
      material: "PA-CF", color: "Czarny", quantity: 6, dims: "60 × 60 × 10 mm", infill: 60, layerHeight: 0.12,
      deadline: iso(now + 10 * DAY),
      status: "pending", createdAt: now - 20 * 3600_000, updatedAt: now - 20 * 3600_000,
      events: [e(now - 20 * 3600_000, "u_kuba", "created", "Prośba o pomoc przy zleceniu WR-1006.")],
    },
  ];
  for (const r of reqs) {
    await db.set(`req:${r.id}`, r);
    await db.sadd("reqs", r.id);
  }
  await db.set("counter:req", 1007);
}

function iso(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

/* ───────────────────────── users ───────────────────────── */

export function toPublic(u: User): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passHash, email, ...rest } = u;
  return rest;
}

export async function getUser(id: string) {
  await ensureSeeded();
  return kv().get<User>(`user:${id}`);
}

export async function getUserByEmail(email: string) {
  await ensureSeeded();
  const id = await kv().get<string>(`email:${email.trim().toLowerCase()}`);
  return id ? getUser(id) : null;
}

export async function listUsers() {
  await ensureSeeded();
  const ids = await kv().smembers("users");
  return (await kv().mget<User>(ids.map((i) => `user:${i}`))).filter(Boolean) as User[];
}

export async function listMakers() {
  return (await listUsers())
    .filter((u) => u.role === "maker" && u.maker)
    .sort((a, b) => Number(b.maker!.available) - Number(a.maker!.available) || b.maker!.jobsDone - a.maker!.jobsDone);
}

export async function userMap(ids: string[]) {
  const uniq = [...new Set(ids.filter(Boolean))];
  const users = await kv().mget<User>(uniq.map((i) => `user:${i}`));
  const m: Record<string, PublicUser> = {};
  users.forEach((u) => u && (m[u.id] = toPublic(u)));
  return m;
}

export async function createUser(input: {
  name: string;
  email: string;
  passHash: string;
  role: "client" | "maker";
  city: string;
}) {
  await ensureSeeded();
  const email = input.email.trim().toLowerCase();
  const id = `u_${uid(8)}`;
  const won = await kv().setnx(`email:${email}`, id);
  if (!won) throw new DomainError("Konto z tym adresem e-mail już istnieje.");
  const user: User = {
    id,
    name: input.name.trim(),
    email,
    passHash: input.passHash,
    role: input.role,
    city: input.city.trim(),
    bio: "",
    createdAt: Date.now(),
    maker:
      input.role === "maker"
        ? { headline: "Nowy drukarz w sieci", printers: [], materials: [], buildVolume: "", hourlyRate: 15, leadDays: 3, available: true, rating: 0, jobsDone: 0 }
        : undefined,
  };
  await kv().set(`user:${id}`, user);
  await kv().sadd("users", id);
  return user;
}

export async function saveUser(u: User) {
  await kv().set(`user:${u.id}`, u);
}

/* ───────────────────────── requests ───────────────────────── */

export async function getRequest(id: string) {
  await ensureSeeded();
  return kv().get<PrintRequest>(`req:${id}`);
}

async function saveRequest(r: PrintRequest) {
  r.updatedAt = Date.now();
  await kv().set(`req:${r.id}`, r);
}

export async function listRequests() {
  await ensureSeeded();
  const ids = await kv().smembers("reqs");
  const all = (await kv().mget<PrintRequest>(ids.map((i) => `req:${i}`))).filter(Boolean) as PrintRequest[];
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function canView(r: PrintRequest, userId: string) {
  if (r.status === "draft") return r.clientId === userId;
  if (r.status === "open" && r.clientId !== userId) return !!(await getUser(userId))?.maker;
  if (r.clientId === userId || r.makerId === userId || r.requestedById === userId) return true;
  const root = r.rootId === r.id ? r : await getRequest(r.rootId);
  return !!root?.participants.includes(userId);
}

export async function getTree(rootId: string) {
  const all = await listRequests();
  return all.filter((r) => r.rootId === rootId).sort((a, b) => a.createdAt - b.createdAt);
}

async function addParticipant(rootId: string, userId: string) {
  const root = await getRequest(rootId);
  if (root && !root.participants.includes(userId)) {
    root.participants.push(userId);
    await saveRequest(root);
  }
}

function pushEvent(r: PrintRequest, actorId: string, type: EventType, note?: string, refId?: string) {
  r.events.push({ id: uid(8), at: Date.now(), actorId, type, note: note?.trim() || undefined, refId });
}

async function nextCode() {
  const n = await kv().incr("counter:req");
  return `WR-${n}`;
}

export interface NewRequestInput {
  title: string;
  description: string;
  makerId: string;
  material: string;
  color: string;
  quantity: number;
  dims: string;
  infill: number;
  layerHeight: number;
  deadline?: string;
  budget?: number;
  fileUrl?: string;
}

export async function createRequest(client: User, input: NewRequestInput) {
  const maker = await getUser(input.makerId);
  if (!maker?.maker) throw new DomainError("Wybrany drukarz nie istnieje.");
  if (maker.id === client.id) throw new DomainError("Nie możesz wysłać zapytania do samego siebie.");
  const id = `r_${uid(10)}`;
  const r: PrintRequest = {
    id,
    code: await nextCode(),
    rootId: id,
    ...input,
    clientId: client.id,
    makerId: maker.id,
    participants: [client.id, maker.id],
    status: "pending",
    events: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  pushEvent(r, client.id, "created");
  await kv().set(`req:${id}`, r);
  await kv().sadd("reqs", id);
  return r;
}

function assertMaker(r: PrintRequest, user: User) {
  if (r.makerId !== user.id) throw new DomainError("To zapytanie nie jest skierowane do Ciebie.");
}
function assertStatus(r: PrintRequest, ...allowed: RequestStatus[]) {
  if (!allowed.includes(r.status))
    throw new DomainError("Status zapytania zmienił się w międzyczasie — odśwież stronę.");
}

async function load(id: string) {
  const r = await getRequest(id);
  if (!r) throw new DomainError("Nie znaleziono zapytania.");
  return r;
}

/** Drukarz przyjmuje zlecenie (lub prośbę o pomoc). */
export async function acceptRequest(id: string, user: User, quote?: number, eta?: string, note?: string) {
  const r = await load(id);
  assertMaker(r, user);
  assertStatus(r, "pending", "help_requested");
  const wasHelpRequested = r.status === "help_requested";
  r.status = "accepted";
  if (quote) r.quote = quote;
  if (eta) r.eta = eta;
  pushEvent(r, user.id, "accepted", note);
  await saveRequest(r);

  if (wasHelpRequested) {
    // przyjęcie samodzielne — wycofaj otwarte prośby o pomoc
    for (const c of await openChildren(r.id)) {
      c.status = "cancelled";
      pushEvent(c, user.id, "cancelled", "Zlecenie realizowane samodzielnie.");
      await saveRequest(c);
    }
  }

  if (r.parentId) {
    const p = await getRequest(r.parentId);
    if (p) {
      pushEvent(p, user.id, "help_accepted", note || `Przyjęto ${r.quantity} szt.`, r.id);
      if (p.status === "help_requested") {
        p.status = "accepted";
        pushEvent(p, p.makerId, "accepted", "Realizacja wspólna.");
      }
      await saveRequest(p);
    }
  }
  return r;
}

/** Drukarz odrzuca. */
export async function rejectRequest(id: string, user: User, reason?: string) {
  const r = await load(id);
  assertMaker(r, user);
  assertStatus(r, "pending", "help_requested");
  r.status = "rejected";
  pushEvent(r, user.id, "rejected", reason);
  await saveRequest(r);

  for (const c of await openChildren(r.id)) {
    c.status = "cancelled";
    pushEvent(c, user.id, "cancelled", "Zlecenie nadrzędne zostało odrzucone.");
    await saveRequest(c);
  }

  if (r.parentId) {
    const p = await getRequest(r.parentId);
    if (p) {
      pushEvent(p, user.id, "help_rejected", reason, r.id);
      await saveRequest(p);
    }
  }
  return r;
}

/** Drukarz prosi innego drukarza o pomoc — powstaje drugie zapytanie. */
export async function askForHelp(
  id: string,
  user: User,
  helperId: string,
  quantity: number,
  note?: string,
) {
  const r = await load(id);
  assertMaker(r, user);
  assertStatus(r, "pending", "help_requested", "accepted", "printing");
  const helper = await getUser(helperId);
  if (!helper?.maker) throw new DomainError("Wybierz drukarza, którego chcesz poprosić o pomoc.");
  if (helper.id === user.id || helper.id === r.clientId)
    throw new DomainError("Wybierz innego drukarza.");
  const tree = await getTree(r.rootId);
  if (tree.some((c) => c.parentId === r.id && c.makerId === helper.id && ["pending", "accepted", "printing", "help_requested"].includes(c.status)))
    throw new DomainError(`${helper.name} ma już otwartą prośbę przy tym zleceniu.`);
  const qty = Math.max(1, Math.min(quantity || r.quantity, r.quantity));

  const cid = `r_${uid(10)}`;
  const child: PrintRequest = {
    id: cid,
    code: await nextCode(),
    rootId: r.rootId,
    parentId: r.id,
    requestedById: user.id,
    clientId: r.clientId,
    makerId: helper.id,
    participants: [],
    title: r.title.startsWith("Pomoc: ") ? r.title : `Pomoc: ${r.title}`,
    description: note?.trim() ? `${note.trim()}\n\n— Opis oryginalny —\n${r.description}` : r.description,
    material: r.material,
    color: r.color,
    quantity: qty,
    dims: r.dims,
    infill: r.infill,
    layerHeight: r.layerHeight,
    deadline: r.deadline,
    fileUrl: r.fileUrl,
    status: "pending",
    events: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  pushEvent(child, user.id, "created", `Prośba o pomoc przy zleceniu ${r.code}.`);
  await kv().set(`req:${cid}`, child);
  await kv().sadd("reqs", cid);

  if (r.status === "pending") r.status = "help_requested";
  pushEvent(r, user.id, "help_asked", note || `Poproszono ${helper.name} o ${qty} szt.`, cid);
  await saveRequest(r);
  await addParticipant(r.rootId, helper.id);
  return child;
}

const FLOW: Partial<Record<RequestStatus, RequestStatus>> = { accepted: "printing", printing: "ready" };

export async function advanceRequest(id: string, user: User, note?: string) {
  const r = await load(id);
  assertMaker(r, user);
  const next = FLOW[r.status];
  if (!next) throw new DomainError("Nie można przejść do kolejnego etapu.");
  r.status = next;
  pushEvent(r, user.id, next as EventType, note);
  await saveRequest(r);
  return r;
}

/** Zamawiający (lub drukarz, który prosił o pomoc) potwierdza odbiór. */
export async function completeRequest(id: string, user: User) {
  const r = await load(id);
  const owner = r.parentId ? r.requestedById : r.clientId;
  if (owner !== user.id) throw new DomainError("Tylko zamawiający może potwierdzić odbiór.");
  assertStatus(r, "ready");
  r.status = "completed";
  pushEvent(r, user.id, "completed");
  await saveRequest(r);
  const maker = await getUser(r.makerId);
  if (maker?.maker) {
    maker.maker.jobsDone += 1;
    await saveUser(maker);
  }
  return r;
}

export async function cancelRequest(id: string, user: User) {
  const r = await load(id);
  const owner = r.parentId ? r.requestedById : r.clientId;
  if (owner !== user.id) throw new DomainError("Brak uprawnień.");
  assertStatus(r, "pending", "help_requested", "rejected", "draft", "open");
  if (r.status === "open")
    for (const o of await listOffers(r.id))
      if (o.status === "pending") await saveOffer({ ...o, status: "declined" });
  r.status = "cancelled";
  pushEvent(r, user.id, "cancelled");
  await saveRequest(r);
  for (const c of await openChildren(r.id)) {
    c.status = "cancelled";
    pushEvent(c, user.id, "cancelled", "Zlecenie nadrzędne zostało anulowane.");
    await saveRequest(c);
  }
  if (r.parentId) {
    const p = await getRequest(r.parentId);
    if (p) {
      pushEvent(p, user.id, "cancelled", `Wycofano prośbę ${r.code}.`, r.id);
      await saveRequest(p);
    }
  }
  return r;
}

/** Po odrzuceniu zamawiający może skierować zapytanie do kolejnego drukarza. */
export async function reassignRequest(id: string, user: User, makerId: string) {
  const r = await load(id);
  if (r.parentId || r.clientId !== user.id) throw new DomainError("Brak uprawnień.");
  assertStatus(r, "rejected");
  const maker = await getUser(makerId);
  if (!maker?.maker || maker.id === user.id) throw new DomainError("Wybierz drukarza.");
  if (maker.id === r.makerId) throw new DomainError("Ten drukarz już odrzucił zapytanie.");
  r.makerId = maker.id;
  r.status = "pending";
  r.quote = undefined;
  r.eta = undefined;
  if (!r.participants.includes(maker.id)) r.participants.push(maker.id);
  pushEvent(r, user.id, "reassigned", `Wysłano do: ${maker.name}`);
  await saveRequest(r);
  return r;
}

export async function addComment(id: string, user: User, text: string) {
  const r = await load(id);
  if (!(await canView(r, user.id))) throw new DomainError("Brak uprawnień.");
  if (!text.trim()) throw new DomainError("Wiadomość jest pusta.");
  pushEvent(r, user.id, "comment", text.slice(0, 2000));
  await saveRequest(r);
}

async function openChildren(id: string) {
  const all = await listRequests();
  return all.filter((c) => c.parentId === id && (c.status === "pending" || c.status === "help_requested"));
}

export function storageIsPersistent() {
  return kv().persistent;
}

/* ───────────────────────── zamówienia (best fit + oferty) ───────────────────────── */

export interface DraftInput {
  title?: string;
  description?: string;
  material?: string;
  color?: string;
  quantity?: number;
  dims?: string;
  infill?: number;
  layerHeight?: number;
  deadline?: string;
  budget?: number;
  fileUrl?: string;
  files?: Attachment[];
  slicer?: SlicerSummary;
  delivery?: "shipping" | "pickup";
  city?: string;
}

const MAX_FILES = 12;

/** Nowy szkic zamówienia — bez drukarza; ten zostanie wybrany przez oferty. */
export async function createDraft(client: User, source: "file" | "idea" | "slicer", input: DraftInput) {
  await ensureSeeded();
  const id = `r_${uid(10)}`;
  const s = input.slicer;
  const r: PrintRequest = {
    id,
    code: await nextCode(),
    rootId: id,
    clientId: client.id,
    makerId: "",
    participants: [client.id],
    title: input.title || (s ? s.modelName.replace(/\.(stl|3mf|step|stp|obj)$/i, "") : "Nowe zamówienie"),
    description: input.description ?? "",
    material: input.material || s?.filaments[0]?.material || "PLA",
    color: input.color || (s && s.filaments.length > 1 ? `${s.filaments.length} kolory` : s?.filaments[0]?.label) || "Dowolny",
    quantity: input.quantity || s?.quantity || 1,
    dims: input.dims || (s?.size ? `${s.size.map((v) => Math.round(v)).join(" × ")} mm` : "—"),
    infill: input.infill ?? s?.infill ?? 20,
    layerHeight: input.layerHeight ?? s?.layerHeight ?? 0.2,
    deadline: input.deadline,
    budget: input.budget,
    files: (input.files ?? []).slice(0, MAX_FILES),
    slicer: s,
    source,
    delivery: input.delivery ?? "shipping",
    city: input.city || client.city,
    status: "draft",
    events: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  pushEvent(r, client.id, "created");
  await kv().set(`req:${id}`, r);
  await kv().sadd("reqs", id);
  return r;
}

function assertOwner(r: PrintRequest, user: User) {
  if (r.parentId || r.clientId !== user.id) throw new DomainError("To nie jest Twoje zamówienie.");
}

/** Edycja zamówienia — możliwa w szkicu i dopóki zlecenie zbiera oferty. */
export async function updateOrder(id: string, user: User, input: DraftInput) {
  const r = await load(id);
  assertOwner(r, user);
  assertStatus(r, "draft", "open");
  Object.assign(r, Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)));
  if (input.files) r.files = input.files.slice(0, MAX_FILES);
  if (r.status === "open") pushEvent(r, user.id, "comment", "Zamawiający zaktualizował szczegóły zlecenia.");
  await saveRequest(r);
  return r;
}

/** Publikacja: szkic → giełda zleceń. Najlepiej dopasowani drukarze dostają zaproszenie. */
export async function publishOrder(id: string, user: User) {
  const r = await load(id);
  assertOwner(r, user);
  assertStatus(r, "draft");
  if (r.title.trim().length < 4) throw new DomainError("Nadaj zleceniu tytuł (min. 4 znaki).");
  if (!r.files?.length && r.description.trim().length < 20)
    throw new DomainError("Dołącz plik albo opisz pomysł (min. 20 znaków), żeby drukarze mogli wycenić zlecenie.");
  const makers = (await listMakers()).filter((m) => m.id !== user.id);
  r.invited = bestFit(r, makers).filter((f) => f.score >= 55).slice(0, 3).map((f) => f.makerId);
  r.status = "open";
  pushEvent(r, user.id, "published");
  await saveRequest(r);
  return r;
}

export async function listOpenOrders() {
  return (await listRequests()).filter((r) => r.status === "open");
}

/* oferty: offer:<reqId>:<makerId> + zbiór offers:<reqId> — każdy drukarz ma jedną ofertę na zlecenie */

async function saveOffer(o: Offer) {
  o.updatedAt = Date.now();
  await kv().set(`offer:${o.requestId}:${o.makerId}`, o);
  await kv().sadd(`offers:${o.requestId}`, o.makerId);
  await kv().sadd(`maker_offers:${o.makerId}`, o.requestId);
}

export async function listOffers(requestId: string) {
  const makers = await kv().smembers(`offers:${requestId}`);
  const list = (await kv().mget<Offer>(makers.map((m) => `offer:${requestId}:${m}`))).filter(Boolean) as Offer[];
  return list.sort((a, b) => a.createdAt - b.createdAt);
}

export async function getOffer(requestId: string, makerId: string) {
  return kv().get<Offer>(`offer:${requestId}:${makerId}`);
}

export async function offerCounts(requestIds: string[]) {
  const sets = await Promise.all(requestIds.map((id) => kv().smembers(`offers:${id}`)));
  return Object.fromEntries(requestIds.map((id, i) => [id, sets[i].length]));
}

/** Zlecenia, w których drukarz złożył ofertę. */
export async function listMakerOffers(makerId: string) {
  const reqIds = await kv().smembers(`maker_offers:${makerId}`);
  const offers = (await kv().mget<Offer>(reqIds.map((r) => `offer:${r}:${makerId}`))).filter(Boolean) as Offer[];
  return offers.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function submitOffer(requestId: string, maker: User, input: { price: number; eta: string; note?: string }) {
  const r = await load(requestId);
  if (!maker.maker) throw new DomainError("Oferty mogą składać tylko drukarze. Uzupełnij profil drukarza.");
  if (r.clientId === maker.id) throw new DomainError("Nie możesz składać oferty na własne zlecenie.");
  assertStatus(r, "open");
  if (!(input.price > 0 && input.price <= 1_000_000)) throw new DomainError("Podaj cenę w złotych.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.eta)) throw new DomainError("Podaj termin realizacji.");
  if (input.eta < new Date().toISOString().slice(0, 10)) throw new DomainError("Termin nie może być w przeszłości.");
  const prev = await getOffer(requestId, maker.id);
  if (prev?.status === "declined") throw new DomainError("Zamawiający wybrał już inną ofertę.");
  const o: Offer = {
    id: prev?.id ?? `o_${uid(8)}`,
    requestId,
    makerId: maker.id,
    price: Math.round(input.price * 100) / 100,
    eta: input.eta,
    note: input.note?.trim().slice(0, 1000) || undefined,
    status: "pending",
    createdAt: prev?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  };
  await saveOffer(o);
  if (!prev || prev.status === "withdrawn") {
    pushEvent(r, maker.id, "offer", `${o.price} zł · gotowe do ${o.eta}`);
    await saveRequest(r);
  }
  return o;
}

export async function withdrawOffer(requestId: string, maker: User) {
  const o = await getOffer(requestId, maker.id);
  if (!o || o.status !== "pending") throw new DomainError("Nie masz aktywnej oferty w tym zleceniu.");
  await saveOffer({ ...o, status: "withdrawn" });
}

/** Zamawiający wybiera ofertę → zlecenie trafia do drukarza jako przyjęte (dalej zwykły przepływ). */
export async function acceptOffer(requestId: string, user: User, makerId: string) {
  const r = await load(requestId);
  assertOwner(r, user);
  assertStatus(r, "open");
  const offers = await listOffers(requestId);
  const o = offers.find((x) => x.makerId === makerId);
  if (!o || o.status !== "pending") throw new DomainError("Ta oferta nie jest już aktualna.");
  const maker = await getUser(makerId);
  if (!maker?.maker) throw new DomainError("Drukarz nie istnieje.");
  for (const x of offers)
    if (x.status === "pending") await saveOffer({ ...x, status: x.makerId === makerId ? "accepted" : "declined" });
  r.makerId = makerId;
  r.quote = o.price;
  r.eta = o.eta;
  r.acceptedOfferId = o.id;
  r.status = "accepted";
  if (!r.participants.includes(makerId)) r.participants.push(makerId);
  pushEvent(r, user.id, "offer_accepted", `${maker.name} · ${o.price} zł · do ${o.eta}`);
  await saveRequest(r);
  return r;
}

/* ───────── przykładowe zlecenia na giełdzie (demo) ───────── */

async function seedV2() {
  const now = Date.now();
  let ev = 100;
  const e = (at: number, actorId: string, type: EventType, note?: string) => ({ id: `e${++ev}`, at, actorId, type, note });
  const base = { participants: [] as string[], files: [] as Attachment[], makerId: "", delivery: "shipping" as const };
  const orders: PrintRequest[] = [
    {
      ...base, id: "r_co2", code: "WR-1101", rootId: "r_co2", source: "file",
      title: "Obudowa czujnika CO₂ do montażu na ścianie",
      description: "Obudowa dwuczęściowa z kratką wentylacyjną, czujnik SCD41 + ESP32-C3. Ważne: dobre dopasowanie zatrzasków i czyste otwory pod USB-C. Kolor jasny, matowy.",
      clientId: "u_jan", participants: ["u_jan"], city: "Warszawa",
      material: "PETG", color: "Biały mat", quantity: 4, dims: "88 × 64 × 30 mm", infill: 20, layerHeight: 0.16,
      deadline: iso(now + 10 * DAY), budget: 160, invited: ["u_kuba", "u_marta", "u_tomek"],
      status: "open", createdAt: now - 26 * 3600_000, updatedAt: now - 3 * 3600_000,
      events: [e(now - 26 * 3600_000, "u_jan", "created"), e(now - 26 * 3600_000, "u_jan", "published"),
        e(now - 20 * 3600_000, "u_kuba", "offer", "145 zł · gotowe do " + iso(now + 5 * DAY)),
        e(now - 3 * 3600_000, "u_marta", "offer", "128 zł · gotowe do " + iso(now + 4 * DAY))],
    },
    {
      ...base, id: "r_lamp", code: "WR-1102", rootId: "r_lamp", source: "slicer",
      title: "Klosz lampy — wzór woronoja",
      description: "Klosz pod żarówkę E27 LED, druk w trybie wazy albo z cienką ścianką. Zależy mi na równej powierzchni bez widocznego szwu.",
      clientId: "u_ania", participants: ["u_ania"], city: "Łódź",
      material: "PLA", color: "Mleczny", quantity: 1, dims: "180 × 180 × 220 mm", infill: 0, layerHeight: 0.2,
      deadline: iso(now + 14 * DAY), invited: ["u_tomek", "u_marta", "u_kuba"],
      slicer: { modelName: "klosz_voronoi.stl", seconds: 6.4 * 3600, grams: 142, meters: 47.6, plates: 1, changes: 0, quantity: 1, layerHeight: 0.2, infill: 0, walls: 2, supports: "none", profile: "fast", size: [180, 180, 220], filaments: [{ label: "Mleczny", color: "#efe9dc", material: "PLA", grams: 142 }] },
      status: "open", createdAt: now - 5 * 3600_000, updatedAt: now - 5 * 3600_000,
      events: [e(now - 5 * 3600_000, "u_ania", "created"), e(now - 5 * 3600_000, "u_ania", "published")],
    },
    {
      ...base, id: "r_meeple", code: "WR-1103", rootId: "r_meeple", source: "idea",
      title: "Pionki do autorskiej gry planszowej — 4 kolory",
      description: "Pomysł: 48 pionków w kształcie latarni morskiej (po 12 w czterech kolorach), wysokość ok. 25 mm. Mam szkic i zdjęcie podobnego pionka — mogę dosłać. Szukam kogoś, kto pomoże też dopracować model.",
      clientId: "u_jan", participants: ["u_jan"], city: "Warszawa",
      material: "PLA", color: "4 kolory", quantity: 48, dims: "18 × 18 × 25 mm", infill: 15, layerHeight: 0.12,
      deadline: iso(now + 21 * DAY), budget: 250, invited: ["u_ania", "u_marta", "u_tomek"],
      status: "open", createdAt: now - 2 * DAY, updatedAt: now - 30 * 3600_000,
      events: [e(now - 2 * DAY, "u_jan", "created"), e(now - 2 * DAY, "u_jan", "published"),
        e(now - 30 * 3600_000, "u_ania", "offer", "230 zł · gotowe do " + iso(now + 12 * DAY))],
    },
  ];
  const db = kv();
  for (const r of orders) {
    await db.set(`req:${r.id}`, r);
    await db.sadd("reqs", r.id);
  }
  const offer = (requestId: string, makerId: string, price: number, days: number, note: string, at: number) =>
    saveOffer({ id: `o_${requestId}_${makerId}`, requestId, makerId, price, eta: iso(now + days * DAY), note, status: "pending", createdAt: at, updatedAt: at });
  await offer("r_co2", "u_kuba", 145, 5, "PETG matowy od ręki. Wydrukuję jedną sztukę testową i podeślę zdjęcie dopasowania zatrzasków przed resztą.", now - 20 * 3600_000);
  await offer("r_co2", "u_marta", 128, 4, "Mogę wydrukować wszystkie 4 naraz na P1S. Wysyłka InPost w cenie.", now - 3 * 3600_000);
  await offer("r_meeple", "u_ania", 230, 12, "MMU3 — każdy kolor osobno, bez wieży czyszczącej. Pomogę też poprawić model pod druk 0.12 mm.", now - 30 * 3600_000);
}
