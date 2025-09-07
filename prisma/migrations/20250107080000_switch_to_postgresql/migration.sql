-- CreateEnum
CREATE TYPE "ItemCategory" AS ENUM ('NERDY', 'FITNESS', 'GREENTHUMB', 'CREATIVE', 'COZY', 'LUXURY', 'MINIMALIST', 'VINTAGE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tz" TEXT,
    "avatarKey" TEXT,
    "statINT" INTEGER NOT NULL DEFAULT 0,
    "statSTR" INTEGER NOT NULL DEFAULT 0,
    "statVIT" INTEGER NOT NULL DEFAULT 0,
    "statAES" INTEGER NOT NULL DEFAULT 0,
    "statWLH" INTEGER NOT NULL DEFAULT 0,
    "emailVerified" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateLabel" TEXT NOT NULL,
    "lastSentAt" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dailyMinutes" INTEGER NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "roadmapJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startDate" TIMESTAMP(3),
    "contentHash" TEXT,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiaryEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateLabel" TEXT,
    "dayNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiaryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestCompletion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "coinsAwarded" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "ShopItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ItemCategory" NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "placed" BOOLEAN NOT NULL DEFAULT false,
    "posX" INTEGER,
    "posY" INTEGER,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scale" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "UserItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderState_userId_dateLabel_key" ON "ReminderState"("userId", "dateLabel");

-- CreateIndex
CREATE UNIQUE INDEX "Goal_userId_contentHash_key" ON "Goal"("userId", "contentHash");

-- CreateIndex
CREATE INDEX "DiaryEntry_userId_dateLabel_idx" ON "DiaryEntry"("userId", "dateLabel");

-- CreateIndex
CREATE INDEX "DiaryEntry_goalId_dateLabel_idx" ON "DiaryEntry"("goalId", "dateLabel");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ShopItem_name_key" ON "ShopItem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserItem_userId_itemId_key" ON "UserItem"("userId", "itemId");

-- CreateIndex
CREATE INDEX "VerificationToken_identifier_idx" ON "VerificationToken"("identifier");

-- AddForeignKey
ALTER TABLE "ReminderState" ADD CONSTRAINT "ReminderState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryEntry" ADD CONSTRAINT "DiaryEntry_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryEntry" ADD CONSTRAINT "DiaryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestCompletion" ADD CONSTRAINT "QuestCompletion_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestCompletion" ADD CONSTRAINT "QuestCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserItem" ADD CONSTRAINT "UserItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ShopItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserItem" ADD CONSTRAINT "UserItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;