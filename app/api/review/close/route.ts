import { z } from "zod";
import { verifyReviewBearer } from "@/lib/review/auth";
import { closeReviewPr } from "@/lib/review/queue";

const flexNumber = z
  .union([z.number(), z.string()])
  .transform((value) => {
    if (typeof value === "number") {
      return value;
    }
    return Number.parseInt(value, 10);
  })
  .pipe(z.number().int().positive());

const closeSchema = z.object({
  number: flexNumber,
  comment: z.string().optional(),
});

function jsonError(
  status: number,
  error: string,
  extra?: Record<string, unknown>
) {
  return Response.json({ error, ...extra }, { status });
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
  const parsed = closeSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(400, "validation failed", { issues: parsed.error.issues });
  }
  try {
    const result = await closeReviewPr(parsed.data.number, parsed.data.comment);
    console.log(
      `[review] [info] closed ${JSON.stringify({ number: result.number })}`
    );
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return jsonError(500, "close failed", {
      reason: err instanceof Error ? err.message : String(err),
    });
  }
}
