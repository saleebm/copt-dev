import { PostStatus, PostType } from "@/lib/generated/prisma";
import { verifyReviewBearer } from "@/lib/review/auth";
import { listRecentPosts } from "@/lib/review/publish";

function jsonError(
  status: number,
  error: string,
  extra?: Record<string, unknown>
) {
  return Response.json({ error, ...extra }, { status });
}

function parsePostType(raw: string | null): PostType | undefined {
  if (!raw) {
    return;
  }
  const upper = raw.toUpperCase();
  if ((Object.values(PostType) as string[]).includes(upper)) {
    return upper as PostType;
  }
  return;
}

function parseStatus(raw: string | null): PostStatus | undefined {
  if (!raw) {
    return;
  }
  const upper = raw.toUpperCase();
  if ((Object.values(PostStatus) as string[]).includes(upper)) {
    return upper as PostStatus;
  }
  return;
}

export async function GET(request: Request) {
  const auth = verifyReviewBearer(request);
  if (!auth.ok) {
    return jsonError(401, "unauthorized", { reason: auth.reason });
  }
  const url = new URL(request.url);
  const type = parsePostType(url.searchParams.get("type"));
  const status = parseStatus(url.searchParams.get("status"));
  const limit = Number(url.searchParams.get("limit") ?? "25");
  try {
    const rows = await listRecentPosts({
      type,
      status,
      limit: Number.isFinite(limit) ? limit : 25,
    });
    return Response.json({ count: rows.length, items: rows });
  } catch (err) {
    return jsonError(500, "list failed", {
      reason: err instanceof Error ? err.message : String(err),
    });
  }
}
