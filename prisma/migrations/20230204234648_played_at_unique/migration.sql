/*
  Warnings:

  - A unique constraint covering the columns `[playedAt]` on the table `Song` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Song_playedAt_key` ON `Song`(`playedAt`);
