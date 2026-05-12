// Bearer-token check for the ingest endpoints. Constant-time compare against
// INGEST_TOKEN so timing leaks don't reveal token shape. See docs/INGEST.md.
import { timingSafeEqual } from "node:crypto";

const BEARER_PREFIX = "Bearer ";

export type AuthResult = { ok: true } | { ok: false; reason: string };

function getExpectedToken(): string | undefined {
  return process.env.INGEST_TOKEN;
}

export function verifyBearer(request: Request): AuthResult {
  const expected = getExpectedToken();
  if (!expected) {
    return { ok: false, reason: "INGEST_TOKEN not configured" };
  }
  const header = request.headers.get("authorization");
  if (!header?.startsWith(BEARER_PREFIX)) {
    return { ok: false, reason: "missing bearer token" };
  }
  const provided = header.slice(BEARER_PREFIX.length).trim();
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return { ok: false, reason: "invalid token" };
  }
  return timingSafeEqual(a, b)
    ? { ok: true }
    : { ok: false, reason: "invalid token" };
}
