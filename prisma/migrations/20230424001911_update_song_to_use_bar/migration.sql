/*
  Warnings:

  - A unique constraint covering the columns `[musicSentimentBarId]` on the table `Song` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Song` ADD COLUMN `musicSentimentBarId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Song_musicSentimentBarId_key` ON `Song`(`musicSentimentBarId`);

-- AddForeignKey
ALTER TABLE `Song` ADD CONSTRAINT `Song_musicSentimentBarId_fkey` FOREIGN KEY (`musicSentimentBarId`) REFERENCES `MusicSentimentBar`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
