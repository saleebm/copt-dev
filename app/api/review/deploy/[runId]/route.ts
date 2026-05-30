import { verifyDeployBearer } from "@/lib/review/auth";
import { getDeployStatus } from "@/lib/review/deploy";

function jsonError(
  status: number,
  error: string,
  extra?: Record<string, unknown>
) {
  return Response.json({ error, ...extra }, { status });
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ runId: string }> }
) {
  const auth = verifyDeployBearer(request);
  if (!auth.ok) {
    return jsonError(401, "unauthorized", { reason: auth.reason });
  }
  const { runId } = await ctx.params;
  const url = new URL(request.url);
  const tail = Number(url.searchParams.get("tailBytes") ?? "16384");
  const status = await getDeployStatus(runId, {
    tailBytes: Number.isFinite(tail) && tail > 0 ? tail : 16_384,
  });
  if (!status) {
    return jsonError(404, "deploy run not found");
  }
  return Response.json(status);
}
