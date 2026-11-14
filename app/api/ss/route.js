import { NextResponse } from "next/server";
import { allEntries, getSantaSettings, isOpen, saveEntry, deleteEntry, myView, reveal, CLOSES_AT } from "@/lib/santa";
import { err, safe } from "@/lib/api";

export const dynamic = "force-dynamic";

// Public view: who's in (names only), whether sign-ups are open, and whether names are drawn.
export const GET = safe(async () => {
  const [entries, settings] = await Promise.all([allEntries(), getSantaSettings()]);
  return NextResponse.json({
    open: isOpen(settings),
    mode: settings.mode,
    closesAt: CLOSES_AT,
    budget: settings.budget,
    drawn: Boolean(settings.matches),
    people: entries.map((e) => ({ id: e.id, name: e.name })),
  });
});

export const POST = safe(async (req) => {
  const body = await req.json().catch(() => null);
  if (!body) return err("Something went wrong. Try again.");
  if (body.action === "me") {
    const view = await myView(body.id, body.token);
    return view ? NextResponse.json(view) : err("Not found on this device.", 404);
  }
  if (body.action === "reveal") {
    const r = await reveal(body);
    return NextResponse.json(r.body, { status: r.status });
  }
  if (body.action === "delete") {
    const r = await deleteEntry(body.id, body.token);
    return NextResponse.json(r.body, { status: r.status });
  }
  const r = await saveEntry(body);
  return NextResponse.json(r.body, { status: r.status });
});
