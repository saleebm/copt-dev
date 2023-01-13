-- CreateTable
CREATE TABLE "SpotifyUser" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "username" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "scope" TEXT NOT NULL
);

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
    "artistHref" TEXT,
    "spotifyUserId" INTEGER NOT NULL,
    CONSTRAINT "Song_spotifyUserId_fkey" FOREIGN KEY ("spotifyUserId") REFERENCES "SpotifyUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SpotifyUser_username_key" ON "SpotifyUser"("username");
