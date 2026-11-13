import { Redis } from "@upstash/redis";

import { getEvent } from "@/lib/events";

// Each event keeps three hashes: <prefix>:rsvps (id -> rsvp JSON), <prefix>:dishes (dish key -> rsvp id)
// and <prefix>:settings (host settings such as the chosen day).
function keysFor(eventId) {
  const ev = getEvent(eventId);
  if (!ev) throw new Error(`Unknown event "${eventId}"`);
  return { RSVPS: `${ev.prefix}:rsvps`, DISHES: `${ev.prefix}:dishes`, SETTINGS: `${ev.prefix}:settings` };
}

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
const memory = globalThis.__tgMemory || (globalThis.__tgMemory = {});
const mem = (k) => (memory[k] ||= {});

const redis = usingDatabase
  ? new Redis({ url, token, automaticDeserialization: false })
  : {
      async hgetall(k) { return { ...mem(k) }; },
      async hget(k, f) { return mem(k)[f] ?? null; },
      async hset(k, obj) { Object.assign(mem(k), obj); return 1; },
      async hsetnx(k, f, v) { if (f in mem(k)) return 0; mem(k)[f] = v; return 1; },
      async hdel(k, ...fs) { fs.forEach((f) => delete mem(k)[f]); return fs.length; },
      async del(...ks) { ks.forEach((k) => { memory[k] = {}; }); return ks.length; },
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

export async function allRsvps(eventId) {
  const { RSVPS } = keysFor(eventId);
  return hashValues(await redis.hgetall(RSVPS)).map(parse).filter((r) => r && r.id);
}

export async function getRsvp(eventId, id) {
  const { RSVPS } = keysFor(eventId);
  const v = await redis.hget(RSVPS, id);
  return v ? parse(v) : null;
}

export async function saveRsvp(eventId, rsvp) {
  const { RSVPS } = keysFor(eventId);
  await redis.hset(RSVPS, { [rsvp.id]: JSON.stringify(rsvp) });
}

export async function removeRsvp(eventId, id) {
  const { RSVPS } = keysFor(eventId);
  await redis.hdel(RSVPS, id);
}

// Atomic first-come claim: returns true if this id now owns the dish key.
export async function claimDish(eventId, key, id) {
  const { RSVPS, DISHES } = keysFor(eventId);
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

export async function releaseDishes(eventId, keys) {
  const { DISHES } = keysFor(eventId);
  if (keys.length) await redis.hdel(DISHES, ...keys);
}

export async function getSettings(eventId) {
  const { SETTINGS } = keysFor(eventId);
  const raw = await redis.hgetall(SETTINGS);
  if (!raw) return {};
  if (Array.isArray(raw)) {
    const o = {};
    for (let i = 0; i < raw.length; i += 2) o[raw[i]] = raw[i + 1];
    return o;
  }
  return { ...raw };
}

export async function setSetting(eventId, field, value) {
  const { SETTINGS } = keysFor(eventId);
  if (value === null || value === "") await redis.hdel(SETTINGS, field);
  else await redis.hset(SETTINGS, { [field]: String(value) });
}

// Host "start over": removes every RSVP and dish claim. Settings (like the chosen day) stay.
export async function resetAll(eventId) {
  const { RSVPS, DISHES } = keysFor(eventId);
  await redis.del(RSVPS, DISHES);
}

export const sessionSecret = env.SESSION_SECRET || token || (globalThis.__tgSecret ||= crypto.randomUUID());
