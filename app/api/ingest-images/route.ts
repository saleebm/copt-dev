import { randomUUID } from "node:crypto";
import { verifyBearer } from "@/lib/ingest/auth";
import { createSubmission } from "@/lib/ingest/db";
import { contentHashForBytes } from "@/lib/ingest/hash";
import {
  extensionForContentType,
  imageMetadataSchema,
} from "@/lib/ingest/schema";
import { stageBytes } from "@/lib/ingest/staging";

function jsonError(status: number, error: string, extra?: Record<string, unknown>) {
  return Response.json({ error, ...extra }, { status });
}

function logRequestShape(request: Request, reason: string, extra?: Record<string, unknown>) {
  const headerKeys: string[] = [];
  request.headers.forEach((_value, key) => headerKeys.push(key));
  const url = new URL(request.url);
  const queryKeys = [...url.searchParams.keys()];
  // biome-ignore lint/suspicious/noConsole: surface in dev-server logs
  console.log(
    "[ingest-images] 400",
    JSON.stringify({
      reason,
      contentType: request.headers.get("content-type"),
      contentLength: request.headers.get("content-length"),
      headerKeys,
      queryKeys,
      xBatchId: request.headers.get("x-batchid"),
      xImageIndex: request.headers.get("x-imageindex"),
      xTotalCount: request.headers.get("x-totalcount"),
      xNotes: request.headers.get("x-notes"),
      ...(extra ?? {}),
    })
  );
}

type ParsedImagePayload = {
  bytes: Uint8Array;
  contentType: string;
  metadata: {
    batchId: string;
    imageIndex: number;
    totalCount: number;
    notes: string;
  };
};

async function parseMultipart(request: Request): Promise<ParsedImagePayload | { error: string }> {
  const form = await request.formData();
  const image = form.get("image");
  if (!(image instanceof File)) {
    return { error: "missing image file field" };
  }
  const metaParsed = imageMetadataSchema.safeParse({
    batchId: form.get("batchId"),
    imageIndex: form.get("imageIndex"),
    totalCount: form.get("totalCount"),
    notes: form.get("notes") ?? "",
  });
  if (!metaParsed.success) {
    return { error: `metadata validation failed: ${metaParsed.error.message}` };
  }
  const bytes = new Uint8Array(await image.arrayBuffer());
  return {
    bytes,
    contentType: image.type || "application/octet-stream",
    metadata: metaParsed.data,
  };
}

async function parseRawBody(request: Request): Promise<ParsedImagePayload | { error: string }> {
  const url = new URL(request.url);
  const get = (key: string) =>
    request.headers.get(`x-${key.toLowerCase()}`) ?? url.searchParams.get(key) ?? "";
  const metaParsed = imageMetadataSchema.safeParse({
    batchId: get("batchId"),
    imageIndex: get("imageIndex"),
    totalCount: get("totalCount"),
    notes: get("notes"),
  });
  if (!metaParsed.success) {
    return { error: `metadata validation failed: ${metaParsed.error.message}` };
  }
  const buf = await request.arrayBuffer();
  if (buf.byteLength === 0) {
    return { error: "empty image body" };
  }
  return {
    bytes: new Uint8Array(buf),
    contentType: request.headers.get("content-type") ?? "application/octet-stream",
    metadata: metaParsed.data,
  };
}

export async function POST(request: Request) {
  const auth = verifyBearer(request);
  if (!auth.ok) {
    return jsonError(401, "unauthorized", { reason: auth.reason });
  }

  const contentType = request.headers.get("content-type") ?? "";
  const parsed = contentType.toLowerCase().includes("multipart/form-data")
    ? await parseMultipart(request)
    : await parseRawBody(request);

  if ("error" in parsed) {
    logRequestShape(request, parsed.error);
    return jsonError(400, parsed.error, { contentType });
  }

  const submissionId = randomUUID();
  const ext = extensionForContentType(parsed.contentType);
  const stagedFilePath = await stageBytes(submissionId, parsed.bytes, ext);
  const contentHash = contentHashForBytes(parsed.bytes);

  const result = await createSubmission({
    kind: "image",
    payload: {
      notes: parsed.metadata.notes,
      contentType: parsed.contentType,
      extension: ext,
    },
    contentHash,
    batchId: parsed.metadata.batchId,
    imageIndex: parsed.metadata.imageIndex,
    totalCount: parsed.metadata.totalCount,
    stagedFilePath,
  });

  return Response.json(
    {
      id: result.submission.id,
      batchId: result.submission.batchId,
      imageIndex: result.submission.imageIndex,
      totalCount: result.submission.totalCount,
      status: result.submission.status,
      deduped: result.status === "deduped",
    },
    { status: result.status === "created" ? 202 : 200 }
  );
}
