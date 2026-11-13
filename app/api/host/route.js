import { NextResponse } from "next/server";
import { allRsvps, setSetting, resetAll, getSettings } from "@/lib/store";
import { saveFromBody, deleteRsvp, publicView } from "@/lib/rsvp";
import { getEvent } from "@/lib/events";
import { isHost } from "@/lib/auth";
import { err, safe, eventFrom } from "@/lib/api";

export const dynamic = "force-dynamic";

export const POST = safe(async (req) => {
  if (!isHost(req)) return err("Please log in as host again.", 401);
  const ev = eventFrom(req);
  if (!ev) return err("Unknown event.", 404);
  const body = await req.json().catch(() => ({}));

  switch (body.action) {
    case "save": {
      const result = await saveFromBody(ev, body.rsvp || {}, { asHost: true });
      const { token, ...out } = result.body; // the guest's private edit code stays with the guest
      return NextResponse.json(out, { status: result.status });
    }
    case "delete": {
      const ok = await deleteRsvp(ev, body.id);
      return ok ? NextResponse.json({ ok: true }) : err("That RSVP is already gone.", 404);
    }
    case "setDay": {
      const day = body.day || "";
      if (day && !getEvent(ev).days.some((d) => d.id === day)) return err("Pick one of the listed days.");
      await setSetting(ev, "chosenDay", day);
      return NextResponse.json({ ok: true, chosenDay: day || null });
    }
    case "reset": {
      if (body.confirm !== "RESET") return err('Type RESET to confirm.');
      await resetAll(ev);
      return NextResponse.json({ ok: true });
    }
    default:
      return err("Unknown action.");
  }
});

export const GET = safe(async (req) => {
  if (!isHost(req)) return err("Please log in as host.", 401);
  const ev = eventFrom(req);
  if (!ev) return err("Unknown event.", 404);
  const [rsvps, settings] = await Promise.all([allRsvps(ev), getSettings(ev)]);
  rsvps.sort((a, b) => a.createdAt - b.createdAt);
  return NextResponse.json({ rsvps: rsvps.map(publicView), chosenDay: settings.chosenDay || null });
});
