// Bearer-token check for the review endpoints. Falls back to INGEST_TOKEN
// so the iOS Shortcut can keep one secret. Set REVIEW_TOKEN explicitly if
// you want different access for the review surface.
import { timingSafeEqual } from "node:crypto";

const BEARER_PREFIX = "Bearer ";

export type AuthResult = { ok: true } | { ok: false; reason: string };

function getExpectedToken(): string | undefined {
  return process.env.REVIEW_TOKEN || process.env.INGEST_TOKEN || undefined;
}

export function verifyReviewBearer(request: Request): AuthResult {
  const expected = getExpectedToken();
  if (!expected) {
    return {
      ok: false,
      reason: "REVIEW_TOKEN (or INGEST_TOKEN) not configured",
    };
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
