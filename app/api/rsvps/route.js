import { NextResponse } from "next/server";
import { usingDatabase, allRsvps, getRsvp, saveRsvp, removeRsvp, claimDish, releaseDishes } from "@/lib/store";
import { dishKey, DISH_TYPES } from "@/lib/dish";

export const dynamic = "force-dynamic";

const STATUSES = ["yes", "maybe", "no"];
const clean = (s, max) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const count = (n) => Math.max(0, Math.min(30, parseInt(n, 10) || 0));
const publicView = ({ token, ...rest }) => rest;
const isAdmin = (req) => process.env.ADMIN_KEY && req.headers.get("x-admin-key") === process.env.ADMIN_KEY;

async function getHandler() {
  const rsvps = await allRsvps();
  rsvps.sort((a, b) => a.createdAt - b.createdAt);
  return NextResponse.json({ rsvps: rsvps.map(publicView), saved: usingDatabase });
}

async function postHandler(req) {
  let body;
  try { body = await req.json(); } catch { return err("Something went wrong sending your RSVP. Try again."); }

  const name = clean(body.name, 60);
  const status = STATUSES.includes(body.status) ? body.status : null;
  if (!name) return err("Add your name so everyone knows who's coming.");
  if (!status) return err("Let us know if you're coming.");

  let existing = null;
  if (body.id) {
    existing = await getRsvp(body.id);
    if (!existing || existing.token !== body.token) {
      return err("We couldn't find your earlier RSVP on this device. Send it as a new one.", 403);
    }
  }

  const dishes = status === "no" ? [] : (Array.isArray(body.dishes) ? body.dishes : [])
    .map((d) => ({ name: clean(d?.name, 60), type: DISH_TYPES.includes(d?.type) ? d.type : "Other" }))
    .filter((d) => d.name && dishKey(d.name))
    .slice(0, 6)
    .map((d) => ({ ...d, key: dishKey(d.name) }));

  const seen = new Set();
  for (const d of dishes) {
    if (seen.has(d.key)) return err(`You listed "${d.name}" twice.`);
    seen.add(d.key);
  }

  const id = existing?.id || crypto.randomUUID();
  const token = existing?.token || crypto.randomUUID();
  const oldKeys = new Set((existing?.dishes || []).map((d) => d.key));

  // Claim new dishes one at a time; each claim is atomic, so two people can't both win.
  const claimed = [];
  const conflicts = [];
  for (const d of dishes) {
    if (oldKeys.has(d.key)) continue;
    if (await claimDish(d.key, id)) claimed.push(d.key);
    else conflicts.push(d);
  }
  if (conflicts.length) {
    await releaseDishes(claimed);
    const everyone = await allRsvps();
    const describe = (d) => {
      const owner = everyone.find((r) => r.dishes?.some((x) => x.key === d.key));
      const theirs = owner?.dishes.find((x) => x.key === d.key)?.name || d.name;
      return `${owner?.name || "Someone"} is already bringing ${theirs.toLowerCase()}.`;
    };
    return NextResponse.json({
      error: conflicts.map(describe).join(" ") + " Pick something else?",
      conflicts: conflicts.map((d) => d.name),
    }, { status: 409 });
  }

  const newKeys = new Set(dishes.map((d) => d.key));
  await releaseDishes([...oldKeys].filter((k) => !newKeys.has(k)));

  const rsvp = {
    id, token, name, status,
    adults: status === "no" ? 0 : Math.max(count(body.adults), status === "yes" ? 1 : 0),
    kids: status === "no" ? 0 : count(body.kids),
    dishes,
    notes: clean(body.notes, 200),
    createdAt: existing?.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
  await saveRsvp(rsvp);
  return NextResponse.json({ id, token, rsvp: publicView(rsvp) });
}

async function deleteHandler(req) {
  const { id, token } = await req.json().catch(() => ({}));
  const rsvp = id && (await getRsvp(id));
  if (!rsvp) return err("That RSVP is already gone.", 404);
  if (rsvp.token !== token && !isAdmin(req)) return err("Only the person who sent this RSVP can remove it.", 403);
  await releaseDishes((rsvp.dishes || []).map((d) => d.key));
  await removeRsvp(id);
  return NextResponse.json({ ok: true });
}

function err(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function safe(handler) {
  return async (req) => {
    try {
      return await handler(req);
    } catch (e) {
      console.error("RSVP API error:", e);
      const hint = /WRONGPASS|NOPERM|Unauthorized|401|403/i.test(String(e?.message))
        ? " The database token may be read-only or wrong; check the KV_REST_API_TOKEN variable in Vercel."
        : "";
      return NextResponse.json({ error: `Server error: ${e?.message || e}.${hint}` }, { status: 500 });
    }
  };
}

export const GET = safe(getHandler);
export const POST = safe(postHandler);
export const DELETE = safe(deleteHandler);
