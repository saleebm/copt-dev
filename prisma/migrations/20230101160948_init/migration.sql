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

-- CreateIndex
CREATE UNIQUE INDEX "SpotifyUser_username_key" ON "SpotifyUser"("username");
