/*
  Warnings:

  - A unique constraint covering the columns `[userId,contentHash]` on the table `Goal` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Goal" ADD COLUMN "contentHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Goal_userId_contentHash_key" ON "Goal"("userId", "contentHash");
