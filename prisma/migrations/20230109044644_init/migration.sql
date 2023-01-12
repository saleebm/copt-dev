-- CreateTable
CREATE TABLE "SpotifyUser" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "username" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "scope" TEXT NOT NULL,

    CONSTRAINT "SpotifyUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Song" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "playedAt" TIMESTAMP(3),
    "uri" TEXT,
    "previewUrl" TEXT,
    "songId" TEXT,
    "href" TEXT,
    "albumArtUrl" TEXT,
    "ablumName" TEXT,
    "artistName" TEXT,
    "artistHref" TEXT,
    "spotifyUserId" INTEGER NOT NULL,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpotifyUser_username_key" ON "SpotifyUser"("username");

-- AddForeignKey
ALTER TABLE "Song" ADD CONSTRAINT "Song_spotifyUserId_fkey" FOREIGN KEY ("spotifyUserId") REFERENCES "SpotifyUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
