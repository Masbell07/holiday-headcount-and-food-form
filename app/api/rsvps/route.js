import { NextResponse } from "next/server";
import { usingDatabase, allRsvps, getRsvp, getSettings } from "@/lib/store";
import { saveFromBody, deleteRsvp, publicView } from "@/lib/rsvp";
import { isHost } from "@/lib/auth";
import { err, safe } from "@/lib/api";

export const dynamic = "force-dynamic";

async function getHandler() {
  const [rsvps, settings] = await Promise.all([allRsvps(), getSettings()]);
  rsvps.sort((a, b) => a.createdAt - b.createdAt);
  return NextResponse.json({ rsvps: rsvps.map(publicView), saved: usingDatabase, chosenDay: settings.chosenDay || null });
}

async function postHandler(req) {
  const body = await req.json().catch(() => null);
  if (!body) return err("Something went wrong sending your RSVP. Try again.");
  const result = await saveFromBody(body);
  return NextResponse.json(result.body, { status: result.status });
}

async function deleteHandler(req) {
  const { id, token } = await req.json().catch(() => ({}));
  const rsvp = id && (await getRsvp(id));
  if (!rsvp) return err("That RSVP is already gone.", 404);
  if (rsvp.token !== token && !isHost(req)) return err("Only the person who sent this RSVP can remove it.", 403);
  await deleteRsvp(id);
  return NextResponse.json({ ok: true });
}

export const GET = safe(getHandler);
export const POST = safe(postHandler);
export const DELETE = safe(deleteHandler);
