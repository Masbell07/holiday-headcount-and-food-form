import { NextResponse } from "next/server";
import { checkLogin, sessionCookie, clearCookie, isHost } from "@/lib/auth";
import { err, safe } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = safe(async (req) => NextResponse.json({ host: isHost(req) }));

export const POST = safe(async (req) => {
  const { user, password } = await req.json().catch(() => ({}));
  if (!checkLogin(user, password)) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return err("That username or password isn't right.", 401);
  }
  const res = NextResponse.json({ host: true });
  res.cookies.set(sessionCookie());
  return res;
});

export const DELETE = safe(async () => {
  const res = NextResponse.json({ host: false });
  res.cookies.set(clearCookie());
  return res;
});
