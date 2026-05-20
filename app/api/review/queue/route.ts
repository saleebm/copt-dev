import { verifyReviewBearer } from "@/lib/review/auth";
import { listReviewQueue } from "@/lib/review/queue";

function jsonError(
  status: number,
  error: string,
  extra?: Record<string, unknown>
) {
  return Response.json({ error, ...extra }, { status });
}

function log(
  level: "info" | "warn" | "error",
  msg: string,
  extra?: Record<string, unknown>
) {
  const payload = extra ? ` ${JSON.stringify(extra)}` : "";
  console.log(`[review] [${level}] ${msg}${payload}`);
}

export async function GET(request: Request) {
  const auth = verifyReviewBearer(request);
  if (!auth.ok) {
    log("warn", "unauthorized", { reason: auth.reason });
    return jsonError(401, "unauthorized", { reason: auth.reason });
  }
  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? undefined;
  const includeNonIngest = url.searchParams.get("all") === "true";
  const state = (url.searchParams.get("state") ?? "open") as
    | "open"
    | "closed"
    | "merged"
    | "all";
  const limit = Number(url.searchParams.get("limit") ?? "50");
  try {
    const items = await listReviewQueue({
      type,
      includeNonIngest,
      state,
      limit: Number.isFinite(limit) ? limit : 50,
    });
    log("info", "queue", { count: items.length, type, state });
    return Response.json({
      count: items.length,
      items,
    });
  } catch (err) {
    log("error", "queue-failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return jsonError(500, "queue failed", {
      reason: err instanceof Error ? err.message : String(err),
    });
  }
}
