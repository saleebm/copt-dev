-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "providerId" TEXT NOT NULL DEFAULT 'filesystem',
ADD COLUMN     "sourceHash" TEXT,
ADD COLUMN     "sourceRecordId" TEXT,
ADD COLUMN     "sourceType" TEXT NOT NULL DEFAULT 'mdx',
ADD COLUMN     "syncStatus" TEXT NOT NULL DEFAULT 'synced';

-- CreateIndex
CREATE INDEX "Post_providerId_idx" ON "Post"("providerId");

-- CreateIndex
CREATE INDEX "Post_syncStatus_idx" ON "Post"("syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Post_providerId_slug_key" ON "Post"("providerId", "slug");
