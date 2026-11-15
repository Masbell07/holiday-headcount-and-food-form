import { NextResponse } from "next/server";
import { isTripper } from "@/lib/trip";
import { divideForecast } from "@/lib/tripgeo";
import { err, safe } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = safe(async (req) => {
  if (!isTripper(req)) return err("Please log in.", 401);
  try {
    return NextResponse.json(await divideForecast());
  } catch {
    return NextResponse.json({ days: {}, unavailable: true });
  }
});
