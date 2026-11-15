import { scryptSync, timingSafeEqual, createHmac, randomUUID } from "node:crypto";
import { kv, sessionSecret } from "@/lib/store";

// Colorado trip page (/colorado). It has its own login, separate from the host login.
// The password is stored only as a salted scrypt hash. To change it, set TRIP_PASSWORD
// (and optionally TRIP_USERS, comma-separated) in Vercel's Environment Variables and redeploy.
// Mel and Nick share one password.
const TRIP_USERS = (process.env.TRIP_USERS || "mel,nick").toLowerCase().split(",").map((u) => u.trim()).filter(Boolean);
const TRIP_PASSWORD_HASH = "2f2bf60dfd86216ee15d84a47c81e37b:a65746ed42d0e72c629f54180e832ba3a43227ee25c7d363394aa5d68ac92d86"; // salt:hash
const COOKIE = "co_trip";
const DAYS = 30;

const scrypt = (pw, saltHex) =>
  scryptSync(String(pw), Buffer.from(saltHex, "hex"), 32, { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
const sameText = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

export function checkTripLogin(user, password) {
  if (!TRIP_USERS.includes(String(user || "").trim().toLowerCase())) {
    scrypt(password, "00");
    return false;
  }
  if (process.env.TRIP_PASSWORD) return sameText(password, process.env.TRIP_PASSWORD);
  const [salt, hash] = TRIP_PASSWORD_HASH.split(":");
  return timingSafeEqual(scrypt(password, salt), Buffer.from(hash, "hex"));
}

const sign = (v) => createHmac("sha256", sessionSecret).update(`trip:${v}`).digest("hex");

export function tripCookie() {
  const value = `trip.${Date.now() + DAYS * 864e5}`;
  return {
    name: COOKIE, value: `${value}.${sign(value)}`,
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/",
    maxAge: DAYS * 86400,
  };
}
export const clearTripCookie = () => ({ name: COOKIE, value: "", path: "/", maxAge: 0 });

export function isTripper(req) {
  const raw = req.cookies.get(COOKIE)?.value || "";
  const i = raw.lastIndexOf(".");
  if (i < 0) return false;
  const value = raw.slice(0, i), sig = raw.slice(i + 1);
  return sameText(sig, sign(value)) && Number(value.split(".")[1]) > Date.now();
}

// ---- Trip data: one JSON document in Redis (or memory locally) ----
const KEY = "colorado26:trip";
const FIELD = "state";
const id = () => randomUUID().slice(0, 8);

const SEED_DAYS = [
  ["thu", "Thu", "Nov 19", "Drive out", "Olathe → Divide", [
    ["Early AM", "Hit the road", "I-70 → US-24", "About 9–10 hrs. Try to hit the mountain stretch in daylight."],
    ["Evening", "Pick up takeout", "Woodland Park", "Divide has few options, so grab dinner on the way up."],
    ["Night", "Game night in", "413 Lake Dr W", "Games, snacks, settle in."]]],
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

export const CATS = ["Clothes", "Outdoor", "Fishing", "Car", "Fun", "Health"];

function seed() {
  return {
    days: SEED_DAYS.map(([k, d, date, title, sub, stops]) => ({
      k, d, date, title, sub,
      stops: stops.map(([time, name, where, note]) => ({ id: id(), time, name, where, note, done: false })),
    })),
    pack: SEED_PACK.map(([name, cat, note = ""]) => ({ id: id(), name, cat, note, m: false, k: false, done: false, who: "" })),
    cam: SEED_CAM.map(([name, note = ""]) => ({ id: id(), name, note, done: false })),
  };
}

export async function getTrip() {
  const raw = await kv.hget(KEY, FIELD);
  let s = null;
  if (raw) { try { s = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { s = null; } }
  if (!s) { s = seed(); await kv.hset(KEY, { [FIELD]: JSON.stringify(s) }); }
  return s;
}

const clip = (v, n = 120) => String(v ?? "").trim().slice(0, n);

// Each change is applied to the latest saved copy, so two phones don't wipe out each other's checks.
export async function applyOp(op) {
  const s = await getTrip();
  const lists = { pack: s.pack, cam: s.cam };
  const allStops = () => s.days.flatMap((d) => d.stops);
  const find = (list, itemId) => (list === "stops" ? allStops() : lists[list] || []).find((x) => x.id === itemId);

  switch (op?.op) {
    case "set": {
      const it = find(op.list, op.id);
      if (!it) return { error: "That item is gone. Refresh to see the latest." };
      if (["done", "m", "k"].includes(op.field)) it[op.field] = Boolean(op.value);
      else if (op.field === "who" && ["", "m", "k"].includes(op.value)) it.who = op.value;
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
        day.stops.push({ id: id(), time: clip(item.time, 30) || "Anytime", name, where: clip(item.where), note: clip(item.note, 300), done: false });
      } else if (op.list === "pack") {
        const cat = CATS.includes(item.cat) ? item.cat : "Clothes";
        s.pack.push({ id: id(), name, cat, note: clip(item.note), m: false, k: false, done: false, who: "" });
      } else if (op.list === "cam") {
        s.cam.push({ id: id(), name, note: clip(item.note), done: false });
      } else return { error: "Unknown list." };
      break;
    }
    case "remove": {
      if (op.list === "stops") s.days.forEach((d) => { d.stops = d.stops.filter((x) => x.id !== op.id); });
      else if (lists[op.list]) s[op.list] = lists[op.list].filter((x) => x.id !== op.id);
      else return { error: "Unknown list." };
      break;
    }
    case "uncheck": {
      if (!lists[op.list]) return { error: "Unknown list." };
      lists[op.list].forEach((x) => { x.done = false; if ("m" in x) { x.m = false; x.k = false; } });
      break;
    }
    default:
      return { error: "Unknown action." };
  }
  await kv.hset(KEY, { [FIELD]: JSON.stringify(s) });
  return { trip: s };
}
