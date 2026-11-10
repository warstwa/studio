import "server-only";
import { Redis } from "@upstash/redis";

/**
 * Minimalny interfejs magazynu klucz–wartość.
 * Produkcja (Vercel): Upstash Redis — zmienne KV_REST_API_URL / KV_REST_API_TOKEN
 * (lub UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN) wstrzykiwane przez integrację.
 * Lokalnie / bez konfiguracji: pamięć procesu (dane znikają po restarcie).
 */
export interface KV {
  get<T>(key: string): Promise<T | null>;
  mget<T>(keys: string[]): Promise<(T | null)[]>;
  /** ex — czas życia klucza w sekundach */
  set(key: string, value: unknown, opts?: { ex?: number }): Promise<void>;
  setnx(key: string, value: unknown): Promise<boolean>;
  del(...keys: string[]): Promise<void>;
  expire(key: string, seconds: number): Promise<void>;
  sadd(key: string, member: string): Promise<void>;
  srem(key: string, member: string): Promise<void>;
  smembers(key: string): Promise<string[]>;
  incr(key: string): Promise<number>;
  readonly persistent: boolean;
}

class MemoryKV implements KV {
  readonly persistent = false;
  private data = new Map<string, { v: unknown; exp?: number }>();
  private sets = new Map<string, Set<string>>();
  private live(key: string) {
    const e = this.data.get(key);
    if (e?.exp && e.exp < Date.now()) {
      this.data.delete(key);
      return undefined;
    }
    return e;
  }
  async get<T>(key: string) {
    const e = this.live(key);
    return e === undefined ? null : (structuredClone(e.v) as T);
  }
  async mget<T>(keys: string[]) {
    return Promise.all(keys.map((k) => this.get<T>(k)));
  }
  async set(key: string, value: unknown, opts?: { ex?: number }) {
    this.data.set(key, { v: structuredClone(value), exp: opts?.ex ? Date.now() + opts.ex * 1000 : undefined });
  }
  async setnx(key: string, value: unknown) {
    if (this.live(key)) return false;
    this.data.set(key, { v: structuredClone(value) });
    return true;
  }
  async del(...keys: string[]) {
    keys.forEach((k) => {
      this.data.delete(k);
      this.sets.delete(k);
    });
  }
  async expire(key: string, seconds: number) {
    const e = this.live(key);
    if (e) e.exp = Date.now() + seconds * 1000;
  }
  async sadd(key: string, member: string) {
    if (!this.sets.has(key)) this.sets.set(key, new Set());
    this.sets.get(key)!.add(member);
  }
  async srem(key: string, member: string) {
    this.sets.get(key)?.delete(member);
  }
  async smembers(key: string) {
    return [...(this.sets.get(key) ?? [])];
  }
  async incr(key: string) {
    const e = this.live(key);
    const n = ((e?.v as number) ?? 0) + 1;
    this.data.set(key, { v: n, exp: e?.exp });
    return n;
  }
}

class RedisKV implements KV {
  readonly persistent = true;
  constructor(private r: Redis, private prefix = "warstwa:") {}
  private k(key: string) {
    return this.prefix + key;
  }
  async get<T>(key: string) {
    return (await this.r.get<T>(this.k(key))) ?? null;
  }
  async mget<T>(keys: string[]) {
    if (keys.length === 0) return [];
    return (await this.r.mget<(T | null)[]>(...keys.map((k) => this.k(k)))) ?? [];
  }
  async set(key: string, value: unknown, opts?: { ex?: number }) {
    if (opts?.ex) await this.r.set(this.k(key), value, { ex: opts.ex });
    else await this.r.set(this.k(key), value);
  }
  async setnx(key: string, value: unknown) {
    const res = await this.r.set(this.k(key), value, { nx: true });
    return res === "OK";
  }
  async del(...keys: string[]) {
    if (keys.length) await this.r.del(...keys.map((k) => this.k(k)));
  }
  async expire(key: string, seconds: number) {
    await this.r.expire(this.k(key), seconds);
  }
  async sadd(key: string, member: string) {
    await this.r.sadd(this.k(key), member);
  }
  async srem(key: string, member: string) {
    await this.r.srem(this.k(key), member);
  }
  async smembers(key: string) {
    return (await this.r.smembers(this.k(key))) as string[];
  }
  async incr(key: string) {
    return this.r.incr(this.k(key));
  }
}

const g = globalThis as unknown as { __warstwaKV?: KV };

export function kv(): KV {
  if (g.__warstwaKV) return g.__warstwaKV;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  g.__warstwaKV =
    url && token ? new RedisKV(new Redis({ url, token })) : new MemoryKV();
  return g.__warstwaKV;
}
