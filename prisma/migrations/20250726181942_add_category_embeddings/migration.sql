-- CreateTable
CREATE TABLE "CategoryEmbedding" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullPath" TEXT NOT NULL,
    "parentPath" TEXT,
    "depth" INTEGER NOT NULL,
    "fileCount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "embedding" DOUBLE PRECISION[],
    "embeddingHash" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "dimensionality" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryEmbedding_path_key" ON "CategoryEmbedding"("path");

-- CreateIndex
CREATE INDEX "CategoryEmbedding_path_idx" ON "CategoryEmbedding"("path");

-- CreateIndex
CREATE INDEX "CategoryEmbedding_parentPath_idx" ON "CategoryEmbedding"("parentPath");

-- CreateIndex
CREATE INDEX "CategoryEmbedding_depth_idx" ON "CategoryEmbedding"("depth");

-- CreateIndex
CREATE INDEX "CategoryEmbedding_embeddingHash_idx" ON "CategoryEmbedding"("embeddingHash");
