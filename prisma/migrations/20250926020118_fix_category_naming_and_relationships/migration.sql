/*
  Warnings:

  - Added the required column `displayName` to the `Category` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Category" ADD COLUMN     "displayName" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Category_name_idx" ON "public"."Category"("name");
