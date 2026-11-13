import { scryptSync, timingSafeEqual, createHmac } from "node:crypto";
import { sessionSecret } from "@/lib/store";

// Host login. The password is stored only as a salted scrypt hash, never in plain text.
// To change it, set HOST_PASSWORD (and optionally HOST_USER) in Vercel's Environment Variables;
// those take priority over the built-in login.
const HOST_USER = (process.env.HOST_USER || "mel").toLowerCase();
const HOST_PASSWORD_HASH = "16b87ba5994cd04d047ccb299dfc6d57:9d3510117d7d465db9d586a2b01e105f460d50d3257486e6beaa84e904a95901"; // salt:hash
const COOKIE = "tg_host";
const DAYS = 30;

function scrypt(password, saltHex) {
  return scryptSync(String(password), Buffer.from(saltHex, "hex"), 32, { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
}

function sameText(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

export function checkLogin(user, password) {
  if (String(user || "").trim().toLowerCase() !== HOST_USER) {
    scrypt(password, "00"); // same work either way, so timing doesn't reveal the username
    return false;
  }
  if (process.env.HOST_PASSWORD) return sameText(password, process.env.HOST_PASSWORD);
  const [salt, hash] = HOST_PASSWORD_HASH.split(":");
  return timingSafeEqual(scrypt(password, salt), Buffer.from(hash, "hex"));
}

const sign = (value) => createHmac("sha256", sessionSecret).update(value).digest("hex");

export function sessionCookie() {
  const expires = Date.now() + DAYS * 864e5;
  const value = `host.${expires}`;
  return {
    name: COOKIE,
    value: `${value}.${sign(value)}`,
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/",
    maxAge: DAYS * 86400,
  };
}

export function clearCookie() {
  return { name: COOKIE, value: "", path: "/", maxAge: 0 };
}

export function isHost(req) {
  const raw = req.cookies.get(COOKIE)?.value || "";
  const i = raw.lastIndexOf(".");
  if (i < 0) return false;
  const value = raw.slice(0, i), sig = raw.slice(i + 1);
  const expires = Number(value.split(".")[1]);
  return sameText(sig, sign(value)) && expires > Date.now();
}
