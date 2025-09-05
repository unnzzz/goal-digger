-- CreateTable
CREATE TABLE "ShopItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "intBoost" INTEGER NOT NULL DEFAULT 0,
    "strBoost" INTEGER NOT NULL DEFAULT 0,
    "vitBoost" INTEGER NOT NULL DEFAULT 0,
    "aesBoost" INTEGER NOT NULL DEFAULT 0,
    "wlhBoost" INTEGER NOT NULL DEFAULT 0,
    "reqINT" INTEGER NOT NULL DEFAULT 0,
    "reqSTR" INTEGER NOT NULL DEFAULT 0,
    "reqVIT" INTEGER NOT NULL DEFAULT 0,
    "reqAES" INTEGER NOT NULL DEFAULT 0,
    "reqWLH" INTEGER NOT NULL DEFAULT 0,
    "reqStatus" TEXT,
    "imageKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "placed" BOOLEAN NOT NULL DEFAULT false,
    "posX" INTEGER,
    "posY" INTEGER,
    CONSTRAINT "UserItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ShopItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tz" TEXT,
    "avatarKey" TEXT,
    "statINT" INTEGER NOT NULL DEFAULT 0,
    "statSTR" INTEGER NOT NULL DEFAULT 0,
    "statVIT" INTEGER NOT NULL DEFAULT 0,
    "statAES" INTEGER NOT NULL DEFAULT 0,
    "statWLH" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_User" ("coins", "createdAt", "email", "id", "name", "passwordHash", "tz") SELECT "coins", "createdAt", "email", "id", "name", "passwordHash", "tz" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ShopItem_name_key" ON "ShopItem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserItem_userId_itemId_key" ON "UserItem"("userId", "itemId");
