import { randomInt, scryptSync, timingSafeEqual, randomBytes } from "node:crypto";
import { kv, hashValues, parse } from "@/lib/store";

// Secret Santa 2026. Entries: ss2026:entries (id -> entry JSON). Settings: ss2026:settings.
const ENTRIES = "ss2026:entries";
const SETTINGS = "ss2026:settings";

// Sign-ups close automatically at the start of Thanksgiving Day (12:00 AM Central, Nov 26, 2026).
export const CLOSES_AT = Date.UTC(2026, 10, 26, 6, 0, 0);

const clean = (s, max) => String(s ?? "").replace(/[ \t]+/g, " ").trim().slice(0, max);
const cleanLong = (s, max) => String(s ?? "").replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
const householdKey = (s) => clean(s, 60).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
// What may leave the server: never the device token, PIN hash or lockout counters.
export const publicEntry = ({ token, pinHash, pinSalt, fails, lockUntil, ...rest }) => ({ ...rest, hasPin: Boolean(pinHash) });

const PIN_RE = /^\d{4}$/;
const MAX_TRIES = 5;
const LOCK_MS = 15 * 60 * 1000;
function hashPin(pin, salt) {
  return scryptSync(String(pin), Buffer.from(salt, "hex"), 32, { N: 2 ** 14, r: 8, p: 1 }).toString("hex");
}
function pinFields(pin) {
  const salt = randomBytes(16).toString("hex");
  return { pinSalt: salt, pinHash: hashPin(pin, salt), fails: 0, lockUntil: 0 };
}
async function putEntry(e) {
  await kv.hset(ENTRIES, { [e.id]: JSON.stringify(e) });
}

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
    budgetMin: o.budgetMin || "",
    budgetMax: o.budget || "",
    budget: budgetText(o.budgetMin, o.budget),
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

  const pin = String(body.pin ?? "").trim();
  if (pin && !PIN_RE.test(pin)) return { status: 400, body: { error: "Your PIN needs to be exactly 4 numbers." } };
  if (!pin && !existing && !asHost) return { status: 400, body: { error: "Pick a 4-number secret PIN. You'll need it to see who you got." } };

  const entry = {
    ...(existing || {}),
    ...(pin ? pinFields(pin) : {}),
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
  await putEntry(entry);
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

// A participant's own sign-up, for editing on the device they used. Matches are never sent here:
// they come only from reveal(), which needs the person's PIN.
export async function myView(id, token) {
  const e = await getEntry(id);
  if (!e || e.token !== token) return null;
  return { entry: publicEntry(e) };
}

// Show one person who they drew. Needs their PIN (or, for sign-ups made before PINs existed,
// the device token from the phone they signed up on). Too many wrong PINs locks the name for a while.
export async function reveal({ id, pin, token }) {
  const e = await getEntry(id);
  if (!e) return { status: 404, body: { error: "We couldn't find that name. Reload the page and try again." } };
  const settings = await getSantaSettings();
  if (!settings.matches) return { status: 409, body: { error: "Names haven't been drawn yet. Check back after Thanksgiving dinner." } };

  if (e.pinHash) {
    if (e.lockUntil && e.lockUntil > Date.now()) {
      const mins = Math.ceil((e.lockUntil - Date.now()) / 60000);
      return { status: 429, body: { error: `Too many wrong PINs for ${e.name}. Try again in ${mins} minute${mins === 1 ? "" : "s"}, or ask the host.` } };
    }
    if (!String(pin ?? "").trim()) return { status: 400, body: { error: `Enter ${e.name}'s 4-number PIN.` } };
    const ok = PIN_RE.test(String(pin ?? "")) && timingSafeEqual(Buffer.from(hashPin(pin, e.pinSalt), "hex"), Buffer.from(e.pinHash, "hex"));
    if (!ok) {
      const fails = (e.fails || 0) + 1;
      const locked = fails >= MAX_TRIES;
      await putEntry({ ...e, fails: locked ? 0 : fails, lockUntil: locked ? Date.now() + LOCK_MS : 0 });
      const leftTries = MAX_TRIES - fails;
      return { status: 403, body: { error: locked ? `Too many wrong PINs for ${e.name}. Try again in 15 minutes, or ask the host.` : `That PIN isn't right. ${leftTries} ${leftTries === 1 ? "try" : "tries"} left.` } };
    }
    if (e.fails || e.lockUntil) await putEntry({ ...e, fails: 0, lockUntil: 0 });
  } else if (!token || token !== e.token) {
    return { status: 403, body: { error: `${e.name} doesn't have a PIN yet. Ask the host to set one.`, needsPin: true } };
  }

  const rid = settings.matches[e.id];
  const r = rid && (await getEntry(rid));
  if (!r) return { status: 409, body: { error: `${e.name} wasn't in the drawing. Ask the host.` } };
  return { status: 200, body: { name: e.name, match: { name: r.name, wishlist: r.wishlist, sizes: r.sizes, avoid: r.avoid } } };
}

// Host only: set or replace someone's PIN (for people who forgot theirs or signed up before PINs).
export async function setPin(id, pin) {
  const e = await getEntry(id);
  if (!e) return { status: 404, body: { error: "That sign-up is gone." } };
  if (!PIN_RE.test(String(pin ?? "").trim())) return { status: 400, body: { error: "A PIN is exactly 4 numbers." } };
  await putEntry({ ...e, ...pinFields(String(pin).trim()) });
  return { status: 200, body: { ok: true } };
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

// "$20" / "20" -> "$20"; anything else is kept as typed.
const money = (v) => { const t = clean(v, 20); return /^\d+(\.\d{1,2})?$/.test(t) ? `$${t}` : t; };

export function budgetText(min, max) {
  if (min && max) return `${min}–${max}`;
  if (min) return `At least ${min}`;
  if (max) return `Up to ${max}`;
  return "";
}

export async function setBudget({ min, max }) {
  await setSantaSetting("budgetMin", money(min));
  await setSantaSetting("budget", money(max));
}

export async function resetSanta() {
  await kv.del(ENTRIES);
  await clearDraw();
}
