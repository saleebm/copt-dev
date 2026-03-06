-- CreateTable
CREATE TABLE "public"."TagEmbedding" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "embedding" DOUBLE PRECISION[],
    "embeddingHash" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "dimensionality" INTEGER NOT NULL,
    "postCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TagEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TagEmbedding_name_key" ON "public"."TagEmbedding"("name");

-- CreateIndex
CREATE INDEX "TagEmbedding_name_idx" ON "public"."TagEmbedding"("name");

-- CreateIndex
CREATE INDEX "TagEmbedding_embeddingHash_idx" ON "public"."TagEmbedding"("embeddingHash");
