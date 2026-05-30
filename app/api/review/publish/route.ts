import { z } from "zod";
import { verifyReviewBearer } from "@/lib/review/auth";
import { setPublished } from "@/lib/review/publish";

const flexBool = z.union([z.boolean(), z.string()]).transform((value) => {
  if (typeof value === "boolean") {
    return value;
  }
  return value.trim().toLowerCase() === "true";
});

const publishSchema = z.object({
  slug: z.string().trim().min(1),
  published: flexBool,
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
  console.log(`[review] [${level}] ${msg}${payload}`);
}

export async function POST(request: Request) {
  const auth = verifyReviewBearer(request);
  if (!auth.ok) {
    return jsonError(401, "unauthorized", { reason: auth.reason });
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError(400, "invalid JSON body");
  }
  const parsed = publishSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(400, "validation failed", { issues: parsed.error.issues });
  }
  try {
    const result = await setPublished(parsed.data);
    log("info", "publish-toggled", {
      slug: result.slug,
      published: result.published,
    });
    return Response.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.startsWith("post not found")) {
      return jsonError(404, message);
    }
    log("error", "publish-failed", { slug: parsed.data.slug, error: message });
    return jsonError(500, "publish failed", { reason: message });
  }
}
