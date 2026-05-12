-- CreateTable
CREATE TABLE "IngestSubmission" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,
    "batchId" TEXT,
    "imageIndex" INTEGER,
    "totalCount" INTEGER,
    "stagedFilePath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "resultPostSlug" TEXT,
    "resultPrUrl" TEXT,
    "resultBranch" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "IngestSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IngestSubmission_contentHash_key" ON "IngestSubmission"("contentHash");

-- CreateIndex
CREATE INDEX "IngestSubmission_status_idx" ON "IngestSubmission"("status");

-- CreateIndex
CREATE INDEX "IngestSubmission_batchId_idx" ON "IngestSubmission"("batchId");

-- CreateIndex
CREATE INDEX "IngestSubmission_kind_idx" ON "IngestSubmission"("kind");
