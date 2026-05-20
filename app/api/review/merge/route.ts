import { z } from "zod";
import { verifyReviewBearer } from "@/lib/review/auth";
import { setPublished } from "@/lib/review/publish";
import { mergeReviewPr } from "@/lib/review/queue";

const mergeMethodSchema = z.enum(["squash", "merge", "rebase"]);

const flexBool = z.union([z.boolean(), z.string()]).transform((value) => {
  if (typeof value === "boolean") {
    return value;
  }
  return value.trim().toLowerCase() === "true";
});

const flexNumber = z
  .union([z.number(), z.string()])
  .transform((value) => {
    if (typeof value === "number") {
      return value;
    }
    return Number.parseInt(value, 10);
  })
  .pipe(z.number().int().positive());

const mergeSchema = z.object({
  number: flexNumber,
  method: mergeMethodSchema.optional().default("squash"),
  admin: flexBool.optional().default(false),
  deleteBranch: flexBool.optional().default(true),
  publish: flexBool.optional().default(false),
  body: z.string().optional(),
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
  const parsed = mergeSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(400, "validation failed", { issues: parsed.error.issues });
  }
  const { number, method, admin, deleteBranch, publish, body } = parsed.data;
  try {
    const result = await mergeReviewPr({
      number,
      method,
      admin,
      deleteBranch,
      body,
    });
    log("info", "merged", {
      number,
      method,
      provider: result.provider.id,
      slug: result.predictedSlug,
    });

    let publishResult: Awaited<ReturnType<typeof setPublished>> | null = null;
    let publishError: string | null = null;
    if (publish && result.predictedSlug) {
      try {
        publishResult = await setPublished({
          slug: result.predictedSlug,
          published: true,
        });
        log("info", "published-after-merge", { slug: result.predictedSlug });
      } catch (err) {
        publishError = err instanceof Error ? err.message : String(err);
        log("warn", "publish-after-merge-failed", {
          slug: result.predictedSlug,
          error: publishError,
        });
      }
    } else if (publish && !result.predictedSlug) {
      publishError = "no predicted slug for this PR; cannot auto-publish";
    }

    return Response.json({
      ok: true,
      merge: result,
      publish: publishResult,
      publishError,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("error", "merge-failed", { number, error: message });
    return jsonError(500, "merge failed", { reason: message });
  }
}
