// Single source of truth for IngestSubmission state transitions. Shared by the
// HTTP routes (which only call createSubmission) and the worker (which claims,
// marks completed, marks failed). State machine: pending → processing →
// (completed | failed). See docs/INGEST.md#state-machine.
import type { IngestSubmission, Prisma } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";

export type IngestKind = "url" | "image" | "note";
export type IngestStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "skipped";

const UNIQUE_VIOLATION = "P2002";

export type CreateSubmissionInput = {
  kind: IngestKind;
  payload: Prisma.InputJsonValue;
  contentHash: string;
  batchId?: string | null;
  imageIndex?: number | null;
  totalCount?: number | null;
  stagedFilePath?: string | null;
};

export type CreateSubmissionResult =
  | { status: "created"; submission: IngestSubmission }
  | { status: "deduped"; submission: IngestSubmission };

export async function createSubmission(
  input: CreateSubmissionInput
): Promise<CreateSubmissionResult> {
  try {
    const submission = await prisma.ingestSubmission.create({
      data: {
        kind: input.kind,
        payload: input.payload,
        contentHash: input.contentHash,
        batchId: input.batchId ?? null,
        imageIndex: input.imageIndex ?? null,
        totalCount: input.totalCount ?? null,
        stagedFilePath: input.stagedFilePath ?? null,
      },
    });
    return { status: "created", submission };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === UNIQUE_VIOLATION
    ) {
      const existing = await prisma.ingestSubmission.findUnique({
        where: { contentHash: input.contentHash },
      });
      if (existing) {
        return { status: "deduped", submission: existing };
      }
    }
    throw error;
  }
}

export function findById(id: string): Promise<IngestSubmission | null> {
  return prisma.ingestSubmission.findUnique({ where: { id } });
}

export async function claimNextNonImage(): Promise<IngestSubmission | null> {
  const pending = await prisma.ingestSubmission.findFirst({
    where: { status: "pending", kind: { in: ["url", "note"] } },
    orderBy: { createdAt: "asc" },
  });
  if (!pending) {
    return null;
  }
  const claimed = await prisma.ingestSubmission.updateMany({
    where: { id: pending.id, status: "pending" },
    data: {
      status: "processing",
      attempts: { increment: 1 },
      startedAt: new Date(),
    },
  });
  if (claimed.count === 0) {
    return null;
  }
  return prisma.ingestSubmission.findUnique({ where: { id: pending.id } });
}

export async function claimReadyImageBatch(): Promise<IngestSubmission[]> {
  const candidate = await prisma.ingestSubmission.findFirst({
    where: { status: "pending", kind: "image", batchId: { not: null } },
    orderBy: { createdAt: "asc" },
  });
  if (!candidate?.batchId || candidate.totalCount == null) {
    return [];
  }
  const batchCount = await prisma.ingestSubmission.count({
    where: { batchId: candidate.batchId, kind: "image" },
  });
  if (batchCount < candidate.totalCount) {
    return [];
  }
  const rows = await prisma.ingestSubmission.findMany({
    where: {
      batchId: candidate.batchId,
      kind: "image",
      status: "pending",
    },
    orderBy: { imageIndex: "asc" },
  });
  if (rows.length === 0) {
    return [];
  }
  const claim = await prisma.ingestSubmission.updateMany({
    where: {
      batchId: candidate.batchId,
      kind: "image",
      status: "pending",
    },
    data: {
      status: "processing",
      attempts: { increment: 1 },
      startedAt: new Date(),
    },
  });
  if (claim.count === 0) {
    return [];
  }
  return prisma.ingestSubmission.findMany({
    where: { batchId: candidate.batchId, kind: "image", status: "processing" },
    orderBy: { imageIndex: "asc" },
  });
}

export type CompletionPatch = {
  resultPostSlug?: string | null;
  resultPrUrl?: string | null;
  resultBranch?: string | null;
};

export async function markCompleted(
  ids: string[],
  patch: CompletionPatch
): Promise<void> {
  if (ids.length === 0) {
    return;
  }
  await prisma.ingestSubmission.updateMany({
    where: { id: { in: ids } },
    data: {
      status: "completed",
      errorMessage: null,
      completedAt: new Date(),
      ...patch,
    },
  });
}

export async function markFailed(
  ids: string[],
  errorMessage: string
): Promise<void> {
  if (ids.length === 0) {
    return;
  }
  const truncated = errorMessage.slice(0, 4000);
  await prisma.ingestSubmission.updateMany({
    where: { id: { in: ids } },
    data: {
      status: "failed",
      errorMessage: truncated,
      completedAt: new Date(),
    },
  });
}
