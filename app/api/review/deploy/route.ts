import { z } from "zod";
import { verifyDeployBearer } from "@/lib/review/auth";
import { startDeploy } from "@/lib/review/deploy";

const deploySchema = z.object({
  triggeredBy: z.string().trim().max(120).optional(),
  reason: z.string().trim().max(500).optional(),
});

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
  console.log(`[review/deploy] [${level}] ${msg}${payload}`);
}

export async function POST(request: Request) {
  const auth = verifyDeployBearer(request);
  if (!auth.ok) {
    log("warn", "unauthorized", { reason: auth.reason });
    return jsonError(401, "unauthorized", { reason: auth.reason });
  }

  let raw: unknown = {};
  const contentLength = request.headers.get("content-length");
  if (contentLength && contentLength !== "0") {
    try {
      raw = await request.json();
    } catch {
      return jsonError(400, "invalid JSON body");
    }
  }
  const parsed = deploySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(400, "validation failed", {
      issues: parsed.error.issues,
    });
  }

  try {
    const result = startDeploy(parsed.data);
    log("info", "started", {
      runId: result.runId,
      pid: result.pid,
      triggeredBy: parsed.data.triggeredBy ?? "review-api",
    });
    return Response.json(
      {
        ok: true,
        ...result,
        statusUrl: `/api/review/deploy/${result.runId}`,
      },
      { status: 202 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("error", "spawn-failed", { error: message });
    return jsonError(500, "deploy spawn failed", { reason: message });
  }
}
