import { scryptSync, timingSafeEqual, createHmac, randomUUID } from "node:crypto";
import { kv, sessionSecret } from "@/lib/store";

// Colorado trip page (/colorado). It has its own login, separate from the host login.
// Passwords are stored only as salted scrypt hashes.
//  - Mel and Nick (owners) share one password: they see everything, including stops/ideas
//    marked private. The camera bag is Mel's alone.
//  - Alex, Casey and Wesley (guests) share another: they see the itinerary minus anything
//    private, and only their own packing list. Alex and Casey share a couple's list; Wesley has his own.
// To change a password, set TRIP_PASSWORD (owners) or TRIP_GUEST_PASSWORD (guests) in Vercel and redeploy.
const OWNER_HASH = "2f2bf60dfd86216ee15d84a47c81e37b:a65746ed42d0e72c629f54180e832ba3a43227ee25c7d363394aa5d68ac92d86";
const GUEST_HASH = "b62f773ed90da0accd80e9edc21723e5:3a5e8231b2933b253f1430120efda278ca573689430298e5dd8b45811d74175e";
const COOKIE = "co_trip";
const DAYS = 30;

export const PARTIES = {
  mn: [{ key: "m", label: "Mel" }, { key: "k", label: "Nick" }],
  ac: [{ key: "a", label: "Alex" }, { key: "c", label: "Casey" }],
  w: [{ key: "w", label: "Wesley" }],
};
const USERS = {
  mel: { name: "Mel", role: "owner", party: "mn" },
  nick: { name: "Nick", role: "owner", party: "mn" },
  alex: { name: "Alex", role: "guest", party: "ac" },
  casey: { name: "Casey", role: "guest", party: "ac" },
  wesley: { name: "Wesley", role: "guest", party: "w" },
};
const ALIASES = { wes: "wesley" };
const userKey = (u) => { const k = String(u || "").trim().toLowerCase(); return USERS[ALIASES[k] || k] ? ALIASES[k] || k : null; };

const scrypt = (pw, saltHex) =>
  scryptSync(String(pw), Buffer.from(saltHex, "hex"), 32, { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
const sameText = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};
const matches = (password, stored) => { const [salt, hash] = stored.split(":"); return timingSafeEqual(scrypt(password, salt), Buffer.from(hash, "hex")); };

// Returns the user's key ("mel", "alex", …) or null.
export function checkTripLogin(user, password) {
  const k = userKey(user);
  if (!k) { scrypt(password, "00"); return null; }
  const owner = USERS[k].role === "owner";
  const env = owner ? process.env.TRIP_PASSWORD : process.env.TRIP_GUEST_PASSWORD;
  const ok = env ? sameText(password, env) : matches(password, owner ? OWNER_HASH : GUEST_HASH);
  return ok ? k : null;
}

const sign = (v) => createHmac("sha256", sessionSecret).update(`trip:${v}`).digest("hex");

export function tripCookie(user) {
  const value = `trip2.${user}.${Date.now() + DAYS * 864e5}`;
  return {
    name: COOKIE, value: `${value}.${sign(value)}`,
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/",
    maxAge: DAYS * 86400,
  };
}
export const clearTripCookie = () => ({ name: COOKIE, value: "", path: "/", maxAge: 0 });

// The signed-in user's key, or null. Older cookies without a name in them are refused.
export function tripUser(req) {
  const raw = req.cookies.get(COOKIE)?.value || "";
  const i = raw.lastIndexOf(".");
  if (i < 0) return null;
  const value = raw.slice(0, i), sig = raw.slice(i + 1);
  const [tag, user, exp] = value.split(".");
  if (tag !== "trip2" || !USERS[user] || !sameText(sig, sign(value)) || !(Number(exp) > Date.now())) return null;
  return user;
}
export const isTripper = (req) => Boolean(tripUser(req));

export function me(user) {
  const u = USERS[user];
  return { user, name: u.name, role: u.role, party: u.party, members: PARTIES[u.party] };
}

// ---- Trip data: one JSON document in Redis (or memory locally) ----
const KEY = "colorado26:trip";
const FIELD = "state";
const id = () => randomUUID().slice(0, 8);

const SEED_DAYS = [
  ["thu", "Thu", "Nov 19", "Drive out", "Olathe → Divide", [
    ["Early AM", "Hit the road", "I-70 → US-24", "About 9–10 hrs. Try to hit the mountain stretch in daylight."],
    ["Evening", "Pick up takeout", "Woodland Park", "Divide has few options, so grab dinner on the way up."],
    ["Night", "Game night in", "413 Lake Drive W, Divide, CO 80814", "Games, snacks, settle in."]]],
  ["fri", "Fri", "Nov 20", "Red rocks & arcade", "Colorado Springs + Manitou", [
    ["Sunrise", "Garden of the Gods", "Colorado Springs", "Free entry. Early light on the rocks is the best of the trip."],
    ["Lunch", "In-N-Out", "495 Garden of the Gods Rd", "A few minutes from the park."],
    ["Afternoon", "Manitou Penny Arcade", "930 Manitou Ave", "Winter hours end around 5–6 PM. Bring quarters. 719-685-9815"],
    ["Evening", "Dinner + barhop", "Manitou / Old Colorado City", "Pick a DD for the ~40 min drive back up."]]],
  ["sat", "Sat", "Nov 21", "Trout & trails", "Close to the cabin", [
    ["Early AM", "Trout fishing", "Eleven Mile Canyon", "Buy a CO nonresident 1-day license on CPWshop first. Spotty service."],
    ["Late morning", "Outlook Ridge Trail", "Mueller State Park", "3.7 mi with overlooks, uphill on the way back. Park pass needed; no dogs on trails."],
    ["Evening", "Fancy dinner", "Reservation TBD", "Book ahead. It's the Saturday before Thanksgiving."]]],
  ["sun", "Sun", "Nov 22", "Homeward", "Divide → Denver → Olathe", [
    ["Early AM", "Early breakfast", "Divide", ""],
    ["Late morning", "Visit Katy", "Denver", "About 2 hrs from Divide."],
    ["Afternoon", "Drive home", "Olathe", "About 8.5 hrs from Denver."]]],
];
const SEED_PACK = [
  ["Base layers", "Clothes", "Nights in the teens"], ["Fleece / midlayer", "Clothes"], ["Puffy jacket", "Clothes"], ["Beanie + gloves", "Clothes"], ["Wool socks", "Clothes"], ["Waterproof boots", "Clothes"], ["Fancy dinner outfit", "Clothes", "Sat night"], ["Going-out outfit", "Clothes", "Fri barhop"], ["PJs + loungewear", "Clothes", "Game night"],
  ["Daypack", "Outdoor"], ["Water bottles", "Outdoor", "Altitude dehydrates"], ["Trail snacks", "Outdoor"], ["Sunscreen", "Outdoor"], ["Sunglasses", "Outdoor"], ["Lip balm", "Outdoor"], ["Microspikes", "Outdoor", "If there's snow"], ["Hand warmers", "Outdoor"],
  ["Rods + reels", "Fishing"], ["Flies / lures", "Fishing"], ["Waders or waterproof boots", "Fishing"], ["Net", "Fishing"], ["CO fishing license", "Fishing", "Save to phone"],
  ["Ice scraper", "Car"], ["Blanket", "Car"], ["Phone chargers", "Car"], ["Offline maps", "Car"], ["State park pass", "Car", "Mueller"],
  ["Board games / cards", "Fun"], ["Quarters", "Fun", "Penny Arcade"], ["Bluetooth speaker", "Fun"],
  ["Headache meds", "Health"], ["Electrolytes", "Health"], ["Lotion", "Health", "Dry air"], ["Toiletries", "Health"],
];
const SEED_CAM = [["Camera body"], ["Second body", "Skip lens swaps at the big moment"], ["Telephoto 70–200+", "Candids from far away"], ["Fast prime 35/50mm", "Portraits + close-ups"], ["Extra batteries ×3", "Keep warm"], ["Memory cards", "Fast + spares"], ["Battery charger"], ["Lens cloth"], ["Camera bag"], ["Dark, muted outfit", "Blend into the rocks"]];

const SEED_IDEAS = [
  ["Hot cocoa + pastries", "Woodland Park", "Warm-up stop after the trail"],
  ["Stargazing from the cabin", "413 Lake Dr W, Divide", "Dark skies at 9,000 ft. Bring the big blanket."],
  ["Cave of the Winds", "Manitou Springs", "Open in winter, last tour around 4 PM"],
];

export const CATS = ["Clothes", "Outdoor", "Fishing", "Car", "Fun", "Health"];

const seedPack = () => SEED_PACK.map(([name, cat, note = ""]) => ({ id: id(), name, cat, qty: "", note }));

function seed() {
  return {
    days: SEED_DAYS.map(([k, d, date, title, sub, stops]) => ({
      k, d, date, title, sub,
      stops: stops.map(([time, name, where, note]) => ({ id: id(), time, name, where, note, done: false })),
    })),
    ideas: SEED_IDEAS.map(([name, where, note = ""]) => ({ id: id(), name, where, link: "", note })),
    packs: { mn: seedPack(), ac: seedPack(), w: seedPack() },
    cam: SEED_CAM.map(([name, note = ""]) => ({ id: id(), name, note, done: false })),
  };
}

export async function getTrip() {
  const raw = await kv.hget(KEY, FIELD);
  let s = null;
  if (raw) { try { s = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { s = null; } }
  if (!s) { s = seed(); await kv.hset(KEY, { [FIELD]: JSON.stringify(s) }); }
  // Bring older saved copies up to date, and save that once so new items keep stable ids.
  let changed = false;
  if (!Array.isArray(s.ideas)) { s.ideas = SEED_IDEAS.map(([name, where, note = ""]) => ({ id: id(), name, where, link: "", note })); changed = true; }
  if (!s.packs) { s.packs = { mn: s.pack || seedPack() }; delete s.pack; changed = true; }
  for (const p of Object.keys(PARTIES)) if (!Array.isArray(s.packs[p])) { s.packs[p] = seedPack(); changed = true; }
  if (changed) await kv.hset(KEY, { [FIELD]: JSON.stringify(s) });
  return s;
}

// What one person is allowed to see. Guests never get the camera bag, the other parties'
// packing lists, or anything marked private.
export function viewFor(s, user) {
  const m = me(user);
  const owner = m.role === "owner";
  const open = (x) => owner || !x.secret;
  return {
    days: s.days.map((d) => ({ ...d, stops: d.stops.filter(open) })),
    ideas: s.ideas.filter(open),
    pack: s.packs[m.party],
    house: s.house || { code: "" },
    ...(user === "mel" ? { cam: s.cam } : {}),
  };
}

const clip = (v, n = 120) => String(v ?? "").trim().slice(0, n);
const cleanLink = (v) => {
  const t = clip(v, 500);
  if (!t) return "";
  const url = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try { return new URL(url).protocol.startsWith("http") ? url : ""; } catch { return ""; }
};

// Each change is applied to the latest saved copy, so two phones don't wipe out each other's checks.
export async function applyOp(op, user) {
  const s = await getTrip();
  const m = me(user);
  const owner = m.role === "owner";
  const keys = m.members.map((x) => x.key);
  const camOk = user === "mel"; // the camera bag is Mel's alone
  const lists = { pack: s.packs[m.party], ideas: s.ideas, ...(camOk ? { cam: s.cam } : {}) };
  const open = (x) => x && (owner || !x.secret);
  const allStops = () => s.days.flatMap((d) => d.stops);
  const find = (list, itemId) => {
    const it = (list === "stops" ? allStops() : lists[list] || []).find((x) => x.id === itemId);
    return open(it) ? it : null;
  };
  if (op?.list === "cam" && !camOk) return { error: "Can't change that." };

  switch (op?.op) {
    case "set": {
      const it = find(op.list, op.id);
      if (!it) return { error: "That item is gone. Refresh to see the latest." };
      const toggles = op.list === "stops" ? ["done"] : op.list === "cam" ? ["m", "k"] : keys;
      if (toggles.includes(op.field)) it[op.field] = Boolean(op.value);
      else return { error: "Can't change that." };
      break;
    }
    case "add": {
      const item = op.item || {};
      const name = clip(item.name);
      if (!name) return { error: "Give it a name first." };
      if (op.list === "stops") {
        const day = s.days.find((d) => d.k === op.day);
        if (!day) return { error: "Pick a day." };
        day.stops.push({ id: id(), time: clip(item.time, 30) || "Anytime", name, where: clip(item.where), link: cleanLink(item.link), note: clip(item.note, 1000), done: false, secret: owner && Boolean(item.secret) });
      } else if (op.list === "pack") {
        const cat = CATS.includes(item.cat) ? item.cat : "Clothes";
        s.packs[m.party].push({ id: id(), name, cat, qty: clip(item.qty, 12), note: clip(item.note, 500) });
      } else if (op.list === "ideas") {
        s.ideas.push({ id: id(), name, where: clip(item.where), link: cleanLink(item.link), note: clip(item.note, 1000), secret: owner && Boolean(item.secret) });
      } else if (op.list === "cam" && camOk) {
        s.cam.push({ id: id(), name, note: clip(item.note, 500), done: false });
      } else return { error: "Unknown list." };
      break;
    }
    case "edit": {
      const it = find(op.list, op.id);
      if (!it) return { error: "That item is gone. Refresh to see the latest." };
      const f = op.fields || {};
      if ("name" in f) { const n = clip(f.name); if (!n) return { error: "It needs a name." }; it.name = n; }
      if ("note" in f) it.note = clip(f.note, op.list === "stops" ? 1000 : 500);
      if (op.list === "stops" || op.list === "ideas") {
        if ("where" in f) it.where = clip(f.where);
        if ("link" in f) it.link = cleanLink(f.link);
      }
      if (op.list === "stops") {
        if ("time" in f) it.time = clip(f.time, 30) || "Anytime";
        if ("where" in f) it.where = clip(f.where);
        if ("link" in f) it.link = cleanLink(f.link);
      }
      if (op.list === "pack") {
        if ("qty" in f) it.qty = clip(f.qty, 12);
        if ("cat" in f && CATS.includes(f.cat)) it.cat = f.cat;
      }
      if (owner && (op.list === "stops" || op.list === "ideas") && "secret" in f) it.secret = Boolean(f.secret);
      break;
    }
    case "remove": {
      if (!find(op.list, op.id)) return { error: "That item is gone. Refresh to see the latest." };
      if (op.list === "stops") s.days.forEach((d) => { d.stops = d.stops.filter((x) => x.id !== op.id); });
      else if (op.list === "pack") s.packs[m.party] = s.packs[m.party].filter((x) => x.id !== op.id);
      else if (lists[op.list]) s[op.list] = lists[op.list].filter((x) => x.id !== op.id);
      else return { error: "Unknown list." };
      break;
    }
    // Move a stop to a day (and position), or between the ideas list and the days.
    case "moveStop": {
      const day = s.days.find((d) => d.k === op.day);
      if (!day) return { error: "Pick a day." };
      if (!find("stops", op.id) && !find("ideas", op.id)) return { error: "That stop is gone. Refresh to see the latest." };
      if (!owner) op.index = undefined; // guests can't see private stops, so their positions would be off
      let it = null;
      s.days.forEach((d) => { const i = d.stops.findIndex((x) => x.id === op.id); if (i >= 0) it = d.stops.splice(i, 1)[0]; });
      if (!it) {
        const i = s.ideas.findIndex((x) => x.id === op.id);
        if (i < 0) return { error: "That stop is gone. Refresh to see the latest." };
        const idea = s.ideas.splice(i, 1)[0];
        it = { id: idea.id, time: clip(op.time, 30) || "Anytime", name: idea.name, where: idea.where || "", link: idea.link || "", note: idea.note || "", done: false, secret: Boolean(idea.secret) };
      }
      const at = Number.isInteger(op.index) ? Math.max(0, Math.min(op.index, day.stops.length)) : day.stops.length;
      day.stops.splice(at, 0, it);
      break;
    }
    case "toIdeas": {
      if (!find("stops", op.id)) return { error: "That stop is gone. Refresh to see the latest." };
      let it = null;
      s.days.forEach((d) => { const i = d.stops.findIndex((x) => x.id === op.id); if (i >= 0) it = d.stops.splice(i, 1)[0]; });
      if (!it) return { error: "That stop is gone. Refresh to see the latest." };
      s.ideas.unshift({ id: it.id, name: it.name, where: it.where || "", link: it.link || "", note: it.note || "", secret: Boolean(it.secret) });
      break;
    }
    case "house": {
      if (!owner) return { error: "Only Mel or Nick can change that." };
      s.house = { ...(s.house || {}), code: clip(op.code, 40) };
      break;
    }
    case "uncheck": {
      if (!lists[op.list]) return { error: "Unknown list." };
      lists[op.list].forEach((x) => { for (const k of op.list === "cam" ? ["m", "k"] : keys) x[k] = false; });
      break;
    }
    default:
      return { error: "Unknown action." };
  }
  await kv.hset(KEY, { [FIELD]: JSON.stringify(s) });
  return { trip: viewFor(s, user) };
}
