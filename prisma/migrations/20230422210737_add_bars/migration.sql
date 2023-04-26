-- CreateTable
CREATE TABLE `MusicSentimentBar` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `songId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MusicSentimentBar` ADD CONSTRAINT `MusicSentimentBar_songId_fkey` FOREIGN KEY (`songId`) REFERENCES `MusicSentimentAnalysis`(`songId`) ON DELETE RESTRICT ON UPDATE CASCADE;
