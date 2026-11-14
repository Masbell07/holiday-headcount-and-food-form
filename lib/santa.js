import { randomInt } from "node:crypto";
import { kv, hashValues, parse } from "@/lib/store";

// Secret Santa 2026. Entries: ss2026:entries (id -> entry JSON). Settings: ss2026:settings.
const ENTRIES = "ss2026:entries";
const SETTINGS = "ss2026:settings";

// Sign-ups close automatically at the start of Thanksgiving Day (12:00 AM Central, Nov 26, 2026).
export const CLOSES_AT = Date.UTC(2026, 10, 26, 6, 0, 0);

const clean = (s, max) => String(s ?? "").replace(/[ \t]+/g, " ").trim().slice(0, max);
const cleanLong = (s, max) => String(s ?? "").replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
const householdKey = (s) => clean(s, 60).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export const publicEntry = ({ token, ...rest }) => rest;

export async function allEntries() {
  const list = hashValues(await kv.hgetall(ENTRIES)).map(parse).filter((e) => e && e.id);
  return list.sort((a, b) => a.createdAt - b.createdAt);
}

async function getEntry(id) {
  const v = id && (await kv.hget(ENTRIES, id));
  return v ? parse(v) : null;
}

export async function getSantaSettings() {
  const raw = await kv.hgetall(SETTINGS);
  const o = {};
  if (Array.isArray(raw)) for (let i = 0; i < raw.length; i += 2) o[raw[i]] = raw[i + 1];
  else Object.assign(o, raw || {});
  return {
    mode: ["open", "closed"].includes(o.mode) ? o.mode : "auto",
    budget: o.budget || "",
    matches: o.matches ? parse(o.matches) : null, // { giverId: receiverId }
    drawnAt: o.drawnAt ? Number(o.drawnAt) : null,
  };
}

async function setSantaSetting(field, value) {
  if (value === null || value === "" || value === undefined) await kv.hdel(SETTINGS, field);
  else await kv.hset(SETTINGS, { [field]: typeof value === "string" ? value : JSON.stringify(value) });
}

export function isOpen(settings, now = Date.now()) {
  if (settings.matches) return false; // names are drawn
  if (settings.mode === "open") return true;
  if (settings.mode === "closed") return false;
  return now < CLOSES_AT;
}

export async function saveEntry(body, { asHost = false } = {}) {
  const settings = await getSantaSettings();
  if (!asHost && !isOpen(settings)) {
    return { status: 403, body: { error: settings.matches ? "Names have already been drawn." : "Sign-ups are closed." } };
  }
  const name = clean(body.name, 60);
  if (!name) return { status: 400, body: { error: asHost ? "Add a name." : "Add your name to join." } };

  let existing = null;
  if (body.id) {
    existing = await getEntry(body.id);
    if (!existing) return { status: 404, body: { error: asHost ? "That sign-up was removed. Reload the page." : "We couldn't find your sign-up on this device. Join again below." } };
    if (!asHost && existing.token !== body.token) return { status: 403, body: { error: "We couldn't find your sign-up on this device." } };
  }

  const others = (await allEntries()).filter((e) => e.id !== existing?.id);
  if (others.some((e) => e.name.toLowerCase() === name.toLowerCase())) {
    return { status: 409, body: { error: `${name} is already signed up. Use a last name or initial to tell people apart.` } };
  }

  const entry = {
    id: existing?.id || crypto.randomUUID(),
    token: existing?.token || crypto.randomUUID(),
    name,
    household: clean(body.household, 60),
    wishlist: cleanLong(body.wishlist, 600),
    sizes: clean(body.sizes, 120),
    avoid: clean(body.avoid, 200),
    createdAt: existing?.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
  await kv.hset(ENTRIES, { [entry.id]: JSON.stringify(entry) });
  return { status: 200, body: { id: entry.id, token: entry.token, entry: publicEntry(entry) } };
}

export async function deleteEntry(id, token, { asHost = false } = {}) {
  const e = await getEntry(id);
  if (!e) return { status: 404, body: { error: "That sign-up is already gone." } };
  if (!asHost && e.token !== token) return { status: 403, body: { error: "Only the person who signed up can remove it." } };
  const settings = await getSantaSettings();
  if (!asHost && settings.matches) return { status: 403, body: { error: "Names have been drawn, so ask the host to take you out." } };
  await kv.hdel(ENTRIES, id);
  return { status: 200, body: { ok: true } };
}

// What one participant may see: their own entry and, after the drawing, who they're buying for.
export async function myView(id, token) {
  const e = await getEntry(id);
  if (!e || e.token !== token) return null;
  const settings = await getSantaSettings();
  let match = null;
  const rid = settings.matches?.[e.id];
  if (rid) {
    const r = await getEntry(rid);
    if (r) match = { name: r.name, wishlist: r.wishlist, sizes: r.sizes, avoid: r.avoid };
  }
  return { entry: publicEntry(e), match };
}

// Random draw: nobody gets themselves, and people in the same household don't get each other.
export function drawMatches(entries) {
  const n = entries.length;
  if (n < 3) return { error: "You need at least 3 people to draw names." };
  const hh = entries.map((e) => householdKey(e.household));
  const ok = (g, r) => g !== r && !(hh[g] && hh[g] === hh[r]);
  for (let attempt = 0; attempt < 5000; attempt++) {
    // One big gift circle through a shuffled order, then check the household rule.
    const order = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) { const j = randomInt(i + 1); [order[i], order[j]] = [order[j], order[i]]; }
    const pairs = order.map((g, i) => [g, order[(i + 1) % n]]);
    if (pairs.every(([g, r]) => ok(g, r))) {
      return { matches: Object.fromEntries(pairs.map(([g, r]) => [entries[g].id, entries[r].id])) };
    }
  }
  return { error: "Couldn't find a drawing where nobody gets someone from their own household. Check the household names, or clear one so the draw can work." };
}

export async function runDraw() {
  const entries = await allEntries();
  const result = drawMatches(entries);
  if (result.error) return { status: 400, body: { error: result.error } };
  await setSantaSetting("matches", result.matches);
  await setSantaSetting("drawnAt", String(Date.now()));
  return { status: 200, body: { ok: true, count: entries.length } };
}

export async function clearDraw() {
  await kv.hdel(SETTINGS, "matches", "drawnAt");
}

export async function setMode(mode) {
  await setSantaSetting("mode", ["open", "closed"].includes(mode) ? mode : "");
}

export async function setBudget(budget) {
  await setSantaSetting("budget", clean(budget, 40));
}

export async function resetSanta() {
  await kv.del(ENTRIES);
  await clearDraw();
}
