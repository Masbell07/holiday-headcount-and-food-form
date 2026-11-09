import { Redis } from "@upstash/redis";

const RSVPS = "tg2026:rsvps"; // hash: id -> rsvp JSON
const DISHES = "tg2026:dishes"; // hash: dish key -> rsvp id (who claimed it)

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const usingDatabase = Boolean(url && token);

// Without a database (local preview) everything lives in memory and resets on restart.
const memory = globalThis.__tgMemory || (globalThis.__tgMemory = { [RSVPS]: {}, [DISHES]: {} });

const redis = usingDatabase
  ? new Redis({ url, token, automaticDeserialization: false })
  : {
      async hgetall(k) { return { ...memory[k] }; },
      async hget(k, f) { return memory[k][f] ?? null; },
      async hset(k, obj) { Object.assign(memory[k], obj); return 1; },
      async hsetnx(k, f, v) { if (f in memory[k]) return 0; memory[k][f] = v; return 1; },
      async hdel(k, ...fs) { fs.forEach((f) => delete memory[k][f]); return fs.length; },
    };

export async function allRsvps() {
  const raw = (await redis.hgetall(RSVPS)) || {};
  return Object.values(raw).map((v) => (typeof v === "string" ? JSON.parse(v) : v));
}

export async function getRsvp(id) {
  const v = await redis.hget(RSVPS, id);
  if (!v) return null;
  return typeof v === "string" ? JSON.parse(v) : v;
}

export async function saveRsvp(rsvp) {
  await redis.hset(RSVPS, { [rsvp.id]: JSON.stringify(rsvp) });
}

export async function removeRsvp(id) {
  await redis.hdel(RSVPS, id);
}

// Atomic first-come claim: returns true if this id now owns the dish key.
export async function claimDish(key, id) {
  const ok = await redis.hsetnx(DISHES, key, id);
  if (ok === 1 || ok === true) return true;
  return (await redis.hget(DISHES, key)) === id;
}

export async function releaseDishes(keys) {
  if (keys.length) await redis.hdel(DISHES, ...keys);
}
