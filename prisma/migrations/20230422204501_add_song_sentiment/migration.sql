/*
  Warnings:

  - A unique constraint covering the columns `[songId]` on the table `Song` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE `MusicSentimentAnalysis` (
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `songId` VARCHAR(191) NOT NULL,
    `mood` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `features` VARCHAR(191) NULL,

    PRIMARY KEY (`songId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Song_songId_key` ON `Song`(`songId`);

-- AddForeignKey
ALTER TABLE `MusicSentimentAnalysis` ADD CONSTRAINT `MusicSentimentAnalysis_songId_fkey` FOREIGN KEY (`songId`) REFERENCES `Song`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
