-- CreateTable
CREATE TABLE `SpotifyUser` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `refreshToken` VARCHAR(191) NOT NULL,
    `accessToken` CHAR(255) NOT NULL,
    `tokenType` VARCHAR(191) NOT NULL,
    `scope` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `SpotifyUser_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Song` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `name` VARCHAR(191) NULL,
    `playedAt` DATETIME(3) NULL,
    `uri` VARCHAR(191) NULL,
    `previewUrl` VARCHAR(191) NULL,
    `songId` VARCHAR(191) NULL,
    `href` VARCHAR(191) NULL,
    `albumArtUrl` VARCHAR(191) NULL,
    `albumName` VARCHAR(191) NULL,
    `artistName` VARCHAR(191) NULL,
    `artistHref` VARCHAR(191) NULL,
    `spotifyUserId` INTEGER NOT NULL,

    UNIQUE INDEX `Song_playedAt_key`(`playedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MusicSentimentBar` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `songId` VARCHAR(191) NOT NULL,
    `songUuid` VARCHAR(191) NULL,

    UNIQUE INDEX `MusicSentimentBar_songUuid_key`(`songUuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MusicSentimentAnalysis` (
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `id` VARCHAR(191) NOT NULL,
    `songId` VARCHAR(191) NOT NULL,
    `mood` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `features` VARCHAR(1000) NULL,

    UNIQUE INDEX `MusicSentimentAnalysis_songId_key`(`songId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Song` ADD CONSTRAINT `Song_spotifyUserId_fkey` FOREIGN KEY (`spotifyUserId`) REFERENCES `SpotifyUser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MusicSentimentBar` ADD CONSTRAINT `MusicSentimentBar_songId_fkey` FOREIGN KEY (`songId`) REFERENCES `MusicSentimentAnalysis`(`songId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MusicSentimentBar` ADD CONSTRAINT `MusicSentimentBar_songUuid_fkey` FOREIGN KEY (`songUuid`) REFERENCES `Song`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
