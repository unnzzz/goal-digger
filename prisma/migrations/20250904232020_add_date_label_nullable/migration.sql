/*
  Warnings:

  - Made the column `goalId` on table `DiaryEntry` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DiaryEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateLabel" TEXT,
    "dayNumber" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiaryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DiaryEntry_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DiaryEntry" ("content", "createdAt", "date", "dayNumber", "goalId", "id", "type", "userId") SELECT "content", "createdAt", "date", "dayNumber", "goalId", "id", "type", "userId" FROM "DiaryEntry";
DROP TABLE "DiaryEntry";
ALTER TABLE "new_DiaryEntry" RENAME TO "DiaryEntry";
CREATE INDEX "DiaryEntry_userId_dateLabel_idx" ON "DiaryEntry"("userId", "dateLabel");
CREATE INDEX "DiaryEntry_goalId_dateLabel_idx" ON "DiaryEntry"("goalId", "dateLabel");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
