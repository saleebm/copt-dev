/**
 * Internal cache invalidation endpoint.
 *
 * `scripts/sync-posts.ts` (and other external tooling) POSTs here after
 * upserting content so the running Next.js server can call `revalidateTag`
 * inside its own runtime — calls from a standalone Node process don't reach
 * the server's cache otherwise.
 *
 * Guarded by `REVALIDATE_SECRET`. The endpoint is a no-op (still 200) if the
 * secret is unset, to keep local dev quiet; callers are expected to skip
 * when no secret is configured.
 */

import { invalidateTags } from "@/lib/cache-invalidation";

interface RevalidatePayload {
  tags?: unknown;
}

function jsonError(status: number, error: string) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return Response.json({
      ok: true,
      revalidated: false,
      reason: "REVALIDATE_SECRET not configured",
    });
  }

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (header !== expected) {
    return jsonError(401, "unauthorized");
  }

  let body: RevalidatePayload;
  try {
    body = (await request.json()) as RevalidatePayload;
  } catch {
    return jsonError(400, "invalid JSON body");
  }

  if (!Array.isArray(body.tags)) {
    return jsonError(400, "tags must be an array of strings");
  }
  const tags = body.tags.filter(
    (t): t is string => typeof t === "string" && t.length > 0
  );
  if (tags.length === 0) {
    return Response.json({ ok: true, revalidated: false, reason: "no tags" });
  }

  invalidateTags(tags);
  return Response.json({ ok: true, revalidated: true, tags });
}
