import { NextResponse } from "next/server";
import { allEntries, getSantaSettings, isOpen, saveEntry, deleteEntry, runDraw, clearDraw, setPin, setMode, setBudget, resetSanta, publicEntry, CLOSES_AT } from "@/lib/santa";
import { isHost } from "@/lib/auth";
import { err, safe } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = safe(async (req) => {
  if (!isHost(req)) return err("Please log in as host.", 401);
  const [entries, settings] = await Promise.all([allEntries(), getSantaSettings()]);
  return NextResponse.json({
    entries: entries.map(publicEntry),
    open: isOpen(settings), mode: settings.mode, closesAt: CLOSES_AT,
    budget: settings.budget, budgetMin: settings.budgetMin, budgetMax: settings.budgetMax, matches: settings.matches, drawnAt: settings.drawnAt,
  });
});

export const POST = safe(async (req) => {
  if (!isHost(req)) return err("Please log in as host again.", 401);
  const body = await req.json().catch(() => ({}));
  let r;
  switch (body.action) {
    case "save": r = await saveEntry(body.entry || {}, { asHost: true }); { const { token, ...out } = r.body; r = { status: r.status, body: out }; } break;
    case "delete": r = await deleteEntry(body.id, null, { asHost: true }); break;
    case "draw": r = await runDraw(); break;
    case "setPin": r = await setPin(body.id, body.pin); break;
    case "clearDraw": await clearDraw(); r = { status: 200, body: { ok: true } }; break;
    case "setMode": await setMode(body.mode); r = { status: 200, body: { ok: true } }; break;
    case "setBudget": await setBudget({ min: body.min, max: body.max }); r = { status: 200, body: { ok: true } }; break;
    case "reset":
      if (body.confirm !== "RESET") return err("Type RESET to confirm.");
      await resetSanta(); r = { status: 200, body: { ok: true } }; break;
    default: return err("Unknown action.");
  }
  return NextResponse.json(r.body, { status: r.status });
});
