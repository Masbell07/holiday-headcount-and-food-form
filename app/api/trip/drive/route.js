import { NextResponse } from "next/server";
import { isTripper } from "@/lib/trip";
import { driveTimes } from "@/lib/tripgeo";
import { err, safe } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export const POST = safe(async (req) => {
  if (!isTripper(req)) return err("Please log in.", 401);
  const { pairs } = await req.json().catch(() => ({}));
  if (!Array.isArray(pairs)) return err("Send pairs.");
  const clean = pairs.filter((p) => Array.isArray(p) && p.length === 2).map(([a, b]) => [String(a).slice(0, 120), String(b).slice(0, 120)]);
  return NextResponse.json({ minutes: await driveTimes(clean) });
});
