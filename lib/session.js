import { parse, serialize } from "cookie";
import { createHmac, timingSafeEqual } from "crypto";

function sessionSecret() {
  const secret = process.env.SESSION_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  if (!secret || secret.length < 16) throw new Error("SESSION_SECRET doit être configuré (au moins 16 caractères).");
  return secret;
}

export function createSessionCookieValue(sessionData) {
  const payload = Buffer.from(JSON.stringify(sessionData)).toString("base64url");
  const signature = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function sessionCookieHeader(sessionData, maxAge = 60 * 60 * 24 * 30) {
  return serialize("aurx_session", createSessionCookieValue(sessionData), {
    path: "/", httpOnly: true, secure: true, sameSite: "none", maxAge,
  });
}

export function readSession(req) {
  const raw = parse(req.headers.cookie || "").aurx_session;
  if (!raw || typeof raw !== "string") return null;
  const separator = raw.lastIndexOf(".");
  if (separator <= 0) return null; // Refuse les anciens cookies JSON/base64 non signés.
  const payload = raw.slice(0, separator);
  const suppliedSignature = raw.slice(separator + 1);
  try {
    const expected = createHmac("sha256", sessionSecret()).update(payload).digest();
    const supplied = Buffer.from(suppliedSignature, "base64url");
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!session || typeof session !== "object" || !(session.id || session.sid || session.email)) return null;
    return session;
  } catch (err) {
    if (err?.message?.includes("SESSION_SECRET")) console.error(err.message);
    return null;
  }
}

export function getUserId(session) {
  return session?.sid || session?.id || session?.email || null;
}
