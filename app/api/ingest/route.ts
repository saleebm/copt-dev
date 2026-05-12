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

export async function POST(request: Request) {
  const auth = verifyBearer(request);
  if (!auth.ok) {
    return jsonError(401, "unauthorized", { reason: auth.reason });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError(400, "invalid JSON body");
  }

  const parsed = urlIngestSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(400, "validation failed", {
      issues: parsed.error.issues,
    });
  }

  const { urls, notes, force } = parsed.data;
  const kind = urls.length > 0 ? "url" : "note";
  const contentHash = contentHashForUrls(urls, notes, force);

  const result = await createSubmission({
    kind,
    payload: { urls, notes, force },
    contentHash,
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
