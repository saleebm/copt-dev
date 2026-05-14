import { verifyBearer } from "@/lib/ingest/auth";
import { createSubmission } from "@/lib/ingest/db";
import { contentHashForUrls } from "@/lib/ingest/hash";
import { urlIngestSchema } from "@/lib/ingest/schema";

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
  console.log(`[ingest] [${level}] ${msg}${payload}`);
}

export async function POST(request: Request) {
  const auth = verifyBearer(request);
  if (!auth.ok) {
    log("warn", "unauthorized", { reason: auth.reason });
    return jsonError(401, "unauthorized", { reason: auth.reason });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    log("warn", "invalid-json");
    return jsonError(400, "invalid JSON body");
  }

  const parsed = urlIngestSchema.safeParse(raw);
  if (!parsed.success) {
    log("warn", "validation-failed", {
      issues: parsed.error.issues.map((i) => ({ path: i.path, code: i.code })),
    });
    return jsonError(400, "validation failed", {
      issues: parsed.error.issues,
    });
  }

  const { urls, notes, force } = parsed.data;
  const kind = urls.length > 0 ? "url" : "note";
  const contentHash = contentHashForUrls(urls, notes, force);
  log("info", "received", {
    kind,
    urlCount: urls.length,
    notesLength: notes.length,
    force,
  });

  const result = await createSubmission({
    kind,
    payload: { urls, notes, force },
    contentHash,
  });

  log("info", result.status === "created" ? "accepted" : "deduped", {
    id: result.submission.id,
    kind,
    status: result.submission.status,
  });

  const body = {
    id: result.submission.id,
    status: result.submission.status,
    kind,
    deduped: result.status === "deduped",
  };
  return Response.json(body, {
    status: result.status === "created" ? 202 : 200,
  });
}
