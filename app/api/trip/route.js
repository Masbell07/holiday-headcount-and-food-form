import { NextResponse } from "next/server";
import { tripUser, getTrip, applyOp, viewFor, me } from "@/lib/trip";
import { usingDatabase } from "@/lib/store";
import { err, safe } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = safe(async (req) => {
  const user = tripUser(req);
  if (!user) return err("Please log in.", 401);
  return NextResponse.json({ trip: viewFor(await getTrip(), user), me: me(user), saved: usingDatabase });
});

export const POST = safe(async (req) => {
  const user = tripUser(req);
  if (!user) return err("Please log in.", 401);
  const op = await req.json().catch(() => ({}));
  const out = await applyOp(op, user);
  if (out.error) return err(out.error);
  return NextResponse.json(out);
});
