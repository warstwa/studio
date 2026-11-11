export type Role = "client" | "maker";

export interface MakerProfile {
  headline: string;
  printers: string[];
  materials: string[];
  buildVolume: string; // np. "256 × 256 × 256 mm"
  hourlyRate: number; // zł / h pracy maszyny
  leadDays: number; // typowy czas realizacji
  available: boolean;
  rating: number; // 0–5
  ratingCount?: number; // liczba ocen składających się na rating
  jobsDone: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  passHash: string;
  role: Role;
  city: string;
  bio: string;
  createdAt: number;
  maker?: MakerProfile;
  avatar?: string; // URL zdjęcia profilowego
  portfolio?: Attachment[]; // galeria realizacji (zdjęcia)
}

export type PublicUser = Omit<User, "passHash" | "email">;

export type RequestStatus =
  | "draft" // szkic zamówienia — widzi go tylko zamawiający
  | "open" // zlecenie na giełdzie — drukarze składają oferty
  | "pending" // czeka na decyzję drukarza (makerId)
  | "help_requested" // drukarz poprosił o pomoc i czeka na odpowiedź
  | "accepted" // przyjęte do realizacji
  | "printing" // w trakcie druku
  | "ready" // gotowe do odbioru / wysłane
  | "completed" // potwierdzone przez zamawiającego
  | "rejected" // odrzucone przez drukarza
  | "cancelled"; // anulowane

export type EventType =
  | "published"
  | "reviewed"
  | "offer"
  | "offer_accepted"
  | "created"
  | "accepted"
  | "rejected"
  | "help_asked"
  | "help_accepted"
  | "help_rejected"
  | "printing"
  | "ready"
  | "completed"
  | "cancelled"
  | "reassigned"
  | "comment";

export interface RequestEvent {
  id: string;
  at: number;
  actorId: string;
  type: EventType;
  note?: string;
  refId?: string; // powiązane zapytanie (np. prośba o pomoc)
  images?: Attachment[]; // zdjęcia w wiadomości
}

export interface PrintRequest {
  id: string;
  code: string; // WR-1042
  title: string;
  description: string;
  clientId: string; // zamawiający całego zlecenia
  makerId: string; // drukarz, do którego obecnie skierowane jest to zapytanie
  requestedById?: string; // dla próśb o pomoc: drukarz, który poprosił
  parentId?: string;
  rootId: string;
  participants: string[]; // kto może widzieć (utrzymywane na root)
  material: string;
  color: string;
  quantity: number;
  dims: string; // "120 × 80 × 40 mm"
  infill: number; // %
  layerHeight: number; // mm
  deadline?: string; // YYYY-MM-DD
  budget?: number; // zł
  fileUrl?: string;
  quote?: number; // wycena drukarza, zł
  eta?: string; // YYYY-MM-DD
  status: RequestStatus;
  /** skąd pochodzi zlecenie */
  source?: "file" | "idea" | "slicer" | "direct";
  files?: Attachment[];
  slicer?: SlicerSummary;
  delivery?: "shipping" | "pickup";
  city?: string;
  /** drukarze wskazani przez dopasowanie (best fit) w chwili publikacji */
  invited?: string[];
  acceptedOfferId?: string;
  events: RequestEvent[];
  createdAt: number;
  updatedAt: number;
}

export const MATERIALS = [
  "PLA",
  "PLA Silk",
  "PETG",
  "ABS",
  "ASA",
  "TPU 95A",
  "PA",
  "PA-CF",
  "PC",
  "Żywica standard",
  "Żywica twarda",
] as const;

export interface Attachment {
  name: string;
  url: string;
  size: number;
  kind: "model" | "image" | "other";
}

/** Wynik z kalkulatora (slicera) zapisany przy „Dodaj do zamówienia”. */
export interface SlicerSummary {
  modelName: string;
  seconds: number;
  grams: number;
  meters: number;
  plates: number;
  changes: number;
  quantity: number;
  layerHeight: number;
  infill: number;
  walls: number;
  supports: string;
  profile: string;
  size?: [number, number, number];
  filaments: { label: string; color: string; material: string; grams: number }[];
}

export interface Offer {
  id: string;
  requestId: string;
  makerId: string;
  price: number;
  eta: string; // YYYY-MM-DD
  note?: string;
  status: "pending" | "accepted" | "declined" | "withdrawn";
  createdAt: number;
  updatedAt: number;
}

/** Ocena zrealizowanego zlecenia — wystawia zamawiający po odbiorze. */
export interface Review {
  id: string;
  requestId: string;
  makerId: string;
  clientId: string;
  quality: number; // 1–5 jakość wydruku
  communication: number; // 1–5 kontakt
  timeliness: number; // 1–5 terminowość
  rating: number; // średnia
  text: string;
  photos: Attachment[];
  title: string; // tytuł zlecenia (do wyświetlenia na profilu)
  createdAt: number;
}
