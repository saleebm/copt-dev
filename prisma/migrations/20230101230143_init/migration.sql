-- CreateTable
CREATE TABLE "Song" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "playedAt" DATETIME,
    "uri" TEXT,
    "previewUrl" TEXT,
    "songId" TEXT,
    "href" TEXT,
    "albumArtUrl" TEXT,
    "ablumName" TEXT,
    "artistName" TEXT,
    "artistHref" TEXT
);
