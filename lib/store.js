import { Redis } from "@upstash/redis";

const RSVPS = "tg2026:rsvps"; // hash: id -> rsvp JSON
const DISHES = "tg2026:dishes"; // hash: dish key -> rsvp id (who claimed it)

// Vercel's Upstash integration may add a custom prefix (e.g. STORAGE_KV_REST_API_URL), so accept any.
const env = process.env;
const findVar = (suffixes, skip = /READ_ONLY/) =>
  Object.keys(env).find((k) => suffixes.some((s) => k.endsWith(s)) && !skip.test(k) && env[k]);
const urlVar = findVar(["KV_REST_API_URL", "UPSTASH_REDIS_REST_URL"]);
const tokenVar = findVar(["KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN"]);
const url = urlVar && env[urlVar];
const token = tokenVar && env[tokenVar];

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

// HGETALL can come back as an object or as a flat [field, value, field, value] list.
function hashValues(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((_, i) => i % 2 === 1);
  return Object.values(raw);
}

function parse(v) {
  if (v && typeof v === "object") return v;
  try { return JSON.parse(v); } catch { return null; }
}

export async function allRsvps() {
  return hashValues(await redis.hgetall(RSVPS)).map(parse).filter((r) => r && r.id);
}

export async function getRsvp(id) {
  const v = await redis.hget(RSVPS, id);
  return v ? parse(v) : null;
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
  const owner = await redis.hget(DISHES, key);
  if (owner === id) return true;
  // The claim belongs to an RSVP that no longer exists (e.g. a save that failed halfway): take it over.
  if (!owner || !(await redis.hget(RSVPS, owner))) {
    await redis.hset(DISHES, { [key]: id });
    return true;
  }
  return false;
}

export async function releaseDishes(keys) {
  if (keys.length) await redis.hdel(DISHES, ...keys);
}
