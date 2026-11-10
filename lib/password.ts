import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// scrypt N=2^15, r=8, p=1 — ok. 30–60 ms na hasło, odporne na łamanie GPU.
const PARAMS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEYLEN = 32;

export function hashPassword(pw: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pw.normalize("NFKC"), salt, KEYLEN, PARAMS).toString("hex");
  return `s2:${salt}:${hash}`;
}

export function verifyPassword(pw: string, stored: string) {
  const parts = stored.split(":");
  // s2:salt:hash — obecny format; salt:hash — starszy (domyślne parametry scrypt)
  const [salt, hash, params] =
    parts[0] === "s2" ? [parts[1], parts[2], PARAMS] : [parts[0], parts[1], undefined];
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, "hex");
  const b = scryptSync(params ? pw.normalize("NFKC") : pw, salt, KEYLEN, params ?? {});
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Czy hash używa starszych parametrów i warto go przeliczyć przy logowaniu. */
export function needsRehash(stored: string) {
  return !stored.startsWith("s2:");
}

// Hash atrapa — liczymy go, gdy konto nie istnieje, żeby czas odpowiedzi nie zdradzał, które e-maile są zarejestrowane.
let dummy: string | undefined;
export function burnTime(pw: string) {
  dummy ??= hashPassword("warstwa-dummy-password");
  verifyPassword(pw, dummy);
}

/** Zwraca komunikat błędu albo null, gdy hasło jest akceptowalne. */
export function passwordProblem(pw: string, ctx: { email?: string; name?: string } = {}) {
  if (pw.length < 8) return "Hasło musi mieć co najmniej 8 znaków.";
  if (pw.length > 128) return "Hasło może mieć maksymalnie 128 znaków.";
  if (!/[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(pw) || !/\d/.test(pw)) return "Hasło musi zawierać co najmniej jedną literę i jedną cyfrę.";
  const low = pw.toLowerCase();
  if (ctx.email && low.includes(ctx.email.split("@")[0].toLowerCase()) && ctx.email.split("@")[0].length >= 4)
    return "Hasło nie może zawierać Twojego adresu e-mail.";
  if (COMMON.has(low)) return "To hasło jest zbyt popularne — wybierz inne.";
  return null;
}

const COMMON = new Set([
  "password1", "haslo123", "qwerty123", "12345678a", "abc12345", "password123", "zaq12wsx", "qwerty12",
  "admin123", "polska123", "iloveyou1", "1q2w3e4r", "1qaz2wsx", "warstwa1", "warstwa123", "demo1234",
]);
