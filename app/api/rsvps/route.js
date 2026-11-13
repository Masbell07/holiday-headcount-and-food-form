import { NextResponse } from "next/server";
import { usingDatabase, allRsvps, getRsvp, getSettings } from "@/lib/store";
import { saveFromBody, deleteRsvp, publicView } from "@/lib/rsvp";
import { isHost } from "@/lib/auth";
import { err, safe, eventFrom } from "@/lib/api";

export const dynamic = "force-dynamic";

async function getHandler(req) {
  const ev = eventFrom(req);
  if (!ev) return err("Unknown event.", 404);
  const [rsvps, settings] = await Promise.all([allRsvps(ev), getSettings(ev)]);
  rsvps.sort((a, b) => a.createdAt - b.createdAt);
  return NextResponse.json({ rsvps: rsvps.map(publicView), saved: usingDatabase, chosenDay: settings.chosenDay || null });
}

async function postHandler(req) {
  const ev = eventFrom(req);
  if (!ev) return err("Unknown event.", 404);
  const body = await req.json().catch(() => null);
  if (!body) return err("Something went wrong sending your RSVP. Try again.");
  const result = await saveFromBody(ev, body);
  return NextResponse.json(result.body, { status: result.status });
}

async function deleteHandler(req) {
  const ev = eventFrom(req);
  if (!ev) return err("Unknown event.", 404);
  const { id, token } = await req.json().catch(() => ({}));
  const rsvp = id && (await getRsvp(ev, id));
  if (!rsvp) return err("That RSVP is already gone.", 404);
  if (rsvp.token !== token && !isHost(req)) return err("Only the person who sent this RSVP can remove it.", 403);
  await deleteRsvp(ev, id);
  return NextResponse.json({ ok: true });
}

export const GET = safe(getHandler);
export const POST = safe(postHandler);
export const DELETE = safe(deleteHandler);
