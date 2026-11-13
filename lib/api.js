import { NextResponse } from "next/server";

export function err(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function safe(handler) {
  return async (req) => {
    try {
      return await handler(req);
    } catch (e) {
      console.error("API error:", e);
      const hint = /WRONGPASS|NOPERM|Unauthorized|401|403/i.test(String(e?.message))
        ? " The database token may be read-only or wrong; check the KV_REST_API_TOKEN variable in Vercel."
        : "";
      return NextResponse.json({ error: `Server error: ${e?.message || e}.${hint}` }, { status: 500 });
    }
  };
}
