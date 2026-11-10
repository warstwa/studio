import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { createHmac, randomBytes } from "node:crypto";
import { getUser } from "./data";
import { kv } from "./kv";
import type { User } from "./types";
export { hashPassword, verifyPassword } from "./password";

/**
 * Sesje po stronie serwera.
 * Ciasteczko przechowuje losowy, 256-bitowy token. W Redisie trzymamy wyłącznie
 * jego HMAC (wyciek bazy nie pozwala przejąć sesji), z czasem wygaśnięcia.
 * Wylogowanie i zmiana hasła usuwają sesje z bazy — skradzione ciasteczko przestaje działać.
 */

const COOKIE = "warstwa_sid";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 dni

interface Session {
  userId: string;
  createdAt: number;
  ua?: string;
}

function secret() {
  return process.env.SESSION_SECRET || "warstwa-dev-secret-zmien-mnie-w-produkcji";
}

function sessionKey(token: string) {
  return `sess:${createHmac("sha256", secret()).update(token).digest("base64url")}`;
}

export async function startSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const key = sessionKey(token);
  const ua = (await headers()).get("user-agent")?.slice(0, 160);
  await kv().set(key, { userId, createdAt: Date.now(), ua } satisfies Session, { ex: MAX_AGE });
  await kv().sadd(`user_sess:${userId}`, key);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const key = sessionKey(token);
    const s = await kv().get<Session>(key);
    await kv().del(key);
    if (s) await kv().srem(`user_sess:${s.userId}`, key);
  }
  jar.delete(COOKIE);
}

/** Usuwa wszystkie sesje użytkownika (np. po zmianie hasła). */
export async function endAllSessions(userId: string) {
  const keys = await kv().smembers(`user_sess:${userId}`);
  if (keys.length) await kv().del(...keys);
  await kv().del(`user_sess:${userId}`);
}

/** Zalogowany użytkownik — jedno zapytanie do bazy na żądanie dzięki cache(). */
export const currentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const s = await kv().get<Session>(sessionKey(token));
  if (!s) return null;
  return getUser(s.userId);
});

/** Adres IP klienta (za proxy Vercela). */
export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "local").trim();
}

/**
 * Prosty limiter: maks. `limit` prób w oknie `windowSec`.
 * Zwraca true, gdy limit został przekroczony.
 */
export async function rateLimited(bucket: string, limit: number, windowSec: number) {
  const key = `rl:${bucket}`;
  const n = await kv().incr(key);
  if (n === 1) await kv().expire(key, windowSec);
  return n > limit;
}

export async function clearRateLimit(bucket: string) {
  await kv().del(`rl:${bucket}`);
}

/** Bezpieczny adres powrotu po logowaniu — tylko ścieżki w obrębie serwisu. */
export function safeNext(next: string | undefined | null, fallback = "/panel") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/** Konta demonstracyjne z danych startowych. */
export const DEMO_IDS = ["u_kuba", "u_ola", "u_tomek", "u_marta", "u_piotr", "u_ania", "u_jan"];
export function demoLoginEnabled() {
  return process.env.DEMO_LOGIN !== "0";
}
