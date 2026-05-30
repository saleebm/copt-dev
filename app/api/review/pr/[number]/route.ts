import { verifyReviewBearer } from "@/lib/review/auth";
import { getReviewPrDetail } from "@/lib/review/queue";

function jsonError(
  status: number,
  error: string,
  extra?: Record<string, unknown>
) {
  return Response.json({ error, ...extra }, { status });
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ number: string }> }
) {
  const auth = verifyReviewBearer(request);
  if (!auth.ok) {
    return jsonError(401, "unauthorized", { reason: auth.reason });
  }
  const { number } = await ctx.params;
  const num = Number(number);
  if (!Number.isInteger(num) || num <= 0) {
    return jsonError(400, "invalid pr number");
  }
  try {
    const detail = await getReviewPrDetail(num);
    return Response.json(detail);
  } catch (err) {
    return jsonError(500, "pr detail failed", {
      reason: err instanceof Error ? err.message : String(err),
    });
  }
}
