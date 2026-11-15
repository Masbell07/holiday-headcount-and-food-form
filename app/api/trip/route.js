import { NextResponse } from "next/server";
import { isTripper, getTrip, applyOp } from "@/lib/trip";
import { usingDatabase } from "@/lib/store";
import { err, safe } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = safe(async (req) => {
  if (!isTripper(req)) return err("Please log in.", 401);
  return NextResponse.json({ trip: await getTrip(), saved: usingDatabase });
});

export const POST = safe(async (req) => {
  if (!isTripper(req)) return err("Please log in.", 401);
  const op = await req.json().catch(() => ({}));
  const out = await applyOp(op);
  if (out.error) return err(out.error);
  return NextResponse.json(out);
});
