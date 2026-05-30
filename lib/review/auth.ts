// Bearer-token check for the review surface. Designed as a precedence list
// so the destructive ops (deploy) can demand a stricter tier while keeping
// the read/merge ops on a more convenient shared secret.
//
// Tier order (first non-empty wins):
//   - publish/merge/queue:  REVIEW_TOKEN -> INGEST_TOKEN
//   - deploy:               DEPLOY_TOKEN -> REVIEW_TOKEN -> INGEST_TOKEN
//
// Keeps iOS Shortcut config simple — if you only set INGEST_TOKEN, everything
// works on a single secret. Override one tier independently when you want
// least-privilege separation (e.g. give the household Shortcut REVIEW_TOKEN
// only, keep DEPLOY_TOKEN on your phone).
import { timingSafeEqual } from "node:crypto";

const BEARER_PREFIX = "Bearer ";

export type AuthResult = { ok: true } | { ok: false; reason: string };

function pickExpected(envVarNames: string[]): {
  token: string | undefined;
  sourceVar: string | undefined;
} {
  for (const name of envVarNames) {
    const value = process.env[name]?.trim();
    if (value) {
      return { token: value, sourceVar: name };
    }
  }
  return { token: undefined, sourceVar: undefined };
}

function constantTimeMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

function verify(request: Request, envVarNames: string[]): AuthResult {
  const { token: expected, sourceVar } = pickExpected(envVarNames);
  if (!expected) {
    return {
      ok: false,
      reason: `none of ${envVarNames.join(", ")} configured`,
    };
  }
  const header = request.headers.get("authorization");
  if (!header?.startsWith(BEARER_PREFIX)) {
    return { ok: false, reason: "missing bearer token" };
  }
  const provided = header.slice(BEARER_PREFIX.length).trim();
  if (!constantTimeMatch(provided, expected)) {
    return { ok: false, reason: `invalid token (expected via ${sourceVar})` };
  }
  return { ok: true };
}

/** Auth tier for `/api/review/{queue,pr,merge,close,posts,publish}`. */
export function verifyReviewBearer(request: Request): AuthResult {
  return verify(request, ["REVIEW_TOKEN", "INGEST_TOKEN"]);
}

/** Auth tier for `/api/review/deploy`. Strictest — destructive op. */
export function verifyDeployBearer(request: Request): AuthResult {
  return verify(request, ["DEPLOY_TOKEN", "REVIEW_TOKEN", "INGEST_TOKEN"]);
}
