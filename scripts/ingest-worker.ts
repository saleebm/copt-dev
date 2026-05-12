// Long-running daemon: poll the IngestSubmission table, claim a row (or a full
// image batch once totalCount rows are present), run the pipeline, mark the
// row(s) completed or failed. Run with `bun run worker` (see docs/INGEST.md).
import { setTimeout as sleep } from "node:timers/promises";
import type { IngestSubmission } from "@/lib/generated/prisma";
import {
  claimNextNonImage,
  claimReadyImageBatch,
  markCompleted,
  markFailed,
} from "@/lib/ingest/db";
import { removeStagedFile } from "@/lib/ingest/staging";
import { processIngest } from "./lib/ingest/pipeline";
import type { PipelineInput, StagedImage } from "./lib/ingest/types";

const DEFAULT_POLL_MS = 5000;

let shuttingDown = false;

function log(level: "info" | "warn" | "error", msg: string, extra?: Record<string, unknown>) {
  const payload = extra ? ` ${JSON.stringify(extra)}` : "";
  // biome-ignore lint/suspicious/noConsole: worker is a CLI process
  console.log(`[ingest-worker] [${level}] ${msg}${payload}`);
}

function pollInterval(): number {
  const raw = process.env.INGEST_POLL_INTERVAL_MS;
  if (!raw) return DEFAULT_POLL_MS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_POLL_MS;
}

type PayloadShape = {
  urls?: unknown;
  notes?: unknown;
  force?: unknown;
};

function readPayload(submission: IngestSubmission): PayloadShape {
  const p = submission.payload;
  if (p && typeof p === "object" && !Array.isArray(p)) {
    return p as PayloadShape;
  }
  return {};
}

function buildInput(rows: IngestSubmission[]): PipelineInput {
  const first = rows[0];
  if (!first) {
    throw new Error("no rows to process");
  }
  if (first.kind === "image") {
    if (!first.batchId) {
      throw new Error(`image row ${first.id} missing batchId`);
    }
    const images: StagedImage[] = rows
      .filter((r) => r.stagedFilePath && r.imageIndex != null)
      .map((r) => {
        const payload = readPayload(r) as { extension?: unknown };
        const extension =
          typeof payload.extension === "string" ? payload.extension : "jpg";
        return {
          submissionId: r.id,
          index: r.imageIndex ?? 0,
          stagedFilePath: r.stagedFilePath as string,
          extension,
        };
      })
      .sort((a, b) => a.index - b.index);
    const notes = (readPayload(first).notes as string | undefined) ?? "";
    return {
      kind: "image",
      submissions: rows,
      batchId: first.batchId,
      notes,
      images,
    };
  }
  const payload = readPayload(first);
  const notes = typeof payload.notes === "string" ? payload.notes : "";
  if (first.kind === "url") {
    const urls = Array.isArray(payload.urls)
      ? (payload.urls as unknown[]).filter((u): u is string => typeof u === "string")
      : [];
    const force = payload.force === true;
    return { kind: "url", submission: first, urls, notes, force };
  }
  return { kind: "note", submission: first, notes };
}

async function processBatch(rows: IngestSubmission[]): Promise<void> {
  const ids = rows.map((r) => r.id);
  const kind = rows[0]?.kind;
  const batchId = rows[0]?.batchId ?? null;
  log("info", "processing", { ids, kind, batchId });
  try {
    const input = buildInput(rows);
    const stageLogger = (stage: string, extra?: Record<string, unknown>) =>
      log("info", `stage:${stage}`, { ids, ...(extra ?? {}) });
    const result = await processIngest(input, stageLogger);
    await markCompleted(ids, {
      resultPostSlug: result.postSlug,
      resultPrUrl: result.prUrl,
      resultBranch: result.branch,
    });
    for (const row of rows) {
      removeStagedFile(row.stagedFilePath);
    }
    log("info", "completed", { ids, prUrl: result.prUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("error", "failed", { ids, error: message });
    await markFailed(ids, message);
  }
}

async function tick(): Promise<boolean> {
  const single = await claimNextNonImage();
  if (single) {
    await processBatch([single]);
    return true;
  }
  const batch = await claimReadyImageBatch();
  if (batch.length > 0) {
    await processBatch(batch);
    return true;
  }
  return false;
}

async function main(): Promise<void> {
  const interval = pollInterval();
  log("info", "started", { pollIntervalMs: interval });
  process.on("SIGINT", () => {
    log("info", "SIGINT received; exiting after current tick");
    shuttingDown = true;
  });
  process.on("SIGTERM", () => {
    log("info", "SIGTERM received; exiting after current tick");
    shuttingDown = true;
  });

  while (!shuttingDown) {
    let didWork = false;
    try {
      didWork = await tick();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log("error", "tick error", { error: message });
    }
    if (shuttingDown) {
      break;
    }
    if (!didWork) {
      await sleep(interval);
    }
  }
  log("info", "shutdown complete");
}

if (import.meta.main) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    log("error", "fatal", { error: message });
    process.exit(1);
  });
}
