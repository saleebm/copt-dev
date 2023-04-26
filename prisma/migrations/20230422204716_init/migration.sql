-- DropForeignKey
ALTER TABLE `MusicSentimentAnalysis` DROP FOREIGN KEY `MusicSentimentAnalysis_songId_fkey`;

-- DropIndex
DROP INDEX `Song_songId_key` ON `Song`;
