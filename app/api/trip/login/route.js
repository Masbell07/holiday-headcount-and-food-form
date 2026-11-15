import { NextResponse } from "next/server";
import { checkTripLogin, tripCookie, clearTripCookie, isTripper } from "@/lib/trip";
import { err, safe } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = safe(async (req) => NextResponse.json({ in: isTripper(req) }));

export const POST = safe(async (req) => {
  const { user, password } = await req.json().catch(() => ({}));
  if (!checkTripLogin(user, password)) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return err("That username or password isn't right.", 401);
  }
  const res = NextResponse.json({ in: true });
  res.cookies.set(tripCookie());
  return res;
});

export const DELETE = safe(async () => {
  const res = NextResponse.json({ in: false });
  res.cookies.set(clearTripCookie());
  return res;
});
