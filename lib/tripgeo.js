import { kv } from "@/lib/store";

// Weather (National Weather Service) and drive times (OpenStreetMap geocoding + OSRM routing)
// for the Colorado trip page. All free, no keys; results are cached so we stay polite.
const UA = "holiday-headcount-and-food-form colorado trip page (vercel)";
const DIVIDE = { lat: 38.9419, lon: -105.1578 };
const GEO = "colorado26:geo";
const DRIVE = "colorado26:drive";

async function getJson(url, { revalidate = 1800, timeout = 8000 } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/geo+json, application/json" }, signal: ctl.signal, next: { revalidate } });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// Daily forecast for Divide, keyed by date (YYYY-MM-DD, Mountain time).
export async function divideForecast() {
  const pt = await getJson(`https://api.weather.gov/points/${DIVIDE.lat},${DIVIDE.lon}`, { revalidate: 86400 });
  const fc = await getJson(pt.properties.forecast);
  const days = {};
  for (const p of fc.properties.periods || []) {
    const date = String(p.startTime).slice(0, 10);
    const d = (days[date] ||= { date });
    if (p.isDaytime) {
      d.high = p.temperature;
      d.short = p.shortForecast;
      d.rain = p.probabilityOfPrecipitation?.value ?? null;
      d.wind = p.windSpeed;
    } else {
      d.low = p.temperature;
      if (!d.short) d.short = p.shortForecast;
    }
  }
  return { updated: fc.properties.updateTime || fc.properties.updated || null, days };
}

const skip = (place) => !place || /\b(tbd|anytime|reservation)\b|→/i.test(place);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function geocode(place) {
  const key = place.trim().toLowerCase();
  const hit = await kv.hget(GEO, key);
  if (hit) return hit === "none" ? null : hit.split(",").map(Number);
  const tries = /\b(co|colorado|ks|kansas)\b/i.test(place) ? [place] : [`${place}, Colorado`, place];
  let found = null;
  for (const q of tries) {
    const r = await getJson(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(q)}`, { revalidate: 604800 });
    await sleep(1100); // Nominatim asks for at most one request a second
    if (r?.[0]) { found = [Number(r[0].lat), Number(r[0].lon)]; break; }
  }
  await kv.hset(GEO, { [key]: found ? found.join(",") : "none" });
  return found;
}

// Minutes of driving for each [from, to] pair, or null where a place can't be found.
export async function driveTimes(pairs, budgetMs = 20000) {
  const start = Date.now();
  const out = [];
  for (const [from, to] of pairs.slice(0, 12)) {
    if (skip(from) || skip(to) || from.trim().toLowerCase() === to.trim().toLowerCase()) { out.push(null); continue; }
    const key = `${from}|${to}`.toLowerCase();
    const hit = await kv.hget(DRIVE, key);
    if (hit) { out.push(hit === "none" ? null : Number(hit)); continue; }
    if (Date.now() - start > budgetMs) { out.push(null); continue; }
    try {
      const a = await geocode(from), b = await geocode(to);
      let mins = null;
      if (a && b) {
        const r = await getJson(`https://router.project-osrm.org/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?overview=false`, { revalidate: 604800 });
        const sec = r?.routes?.[0]?.duration;
        if (Number.isFinite(sec)) mins = Math.max(1, Math.round(sec / 60));
      }
      await kv.hset(DRIVE, { [key]: mins == null ? "none" : String(mins) });
      out.push(mins);
    } catch {
      out.push(null); // not cached, so it's tried again next time
    }
  }
  return out;
}
