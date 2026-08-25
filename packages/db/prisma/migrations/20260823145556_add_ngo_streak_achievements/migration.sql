-- CreateEnum
CREATE TYPE "NgoAchievementCriteriaType" AS ENUM ('drives_hosted', 'trees_planted', 'funds_raised_cents', 'volunteers_reached', 'followers_count', 'streak_weeks');

-- AlterTable
ALTER TABLE "ngo_profiles" ADD COLUMN     "badges_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "streak_current" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "streak_max" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ngo_streak_history" (
    "id" TEXT NOT NULL,
    "ngo_id" TEXT NOT NULL,
    "week_start" DATE NOT NULL,
    "posted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ngo_streak_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ngo_achievements" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "rarity" "Rarity" NOT NULL,
    "criteria_type" "NgoAchievementCriteriaType" NOT NULL,
    "criteria_target" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ngo_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ngo_achievement_unlocks" (
    "id" TEXT NOT NULL,
    "ngo_id" TEXT NOT NULL,
    "achievement_id" TEXT NOT NULL,
    "unlocked" BOOLEAN NOT NULL DEFAULT false,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "unlocked_at" TIMESTAMP(3),

    CONSTRAINT "ngo_achievement_unlocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ngo_streak_history_ngo_id_week_start_idx" ON "ngo_streak_history"("ngo_id", "week_start" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ngo_streak_history_ngo_id_week_start_key" ON "ngo_streak_history"("ngo_id", "week_start");

-- CreateIndex
CREATE UNIQUE INDEX "ngo_achievements_key_key" ON "ngo_achievements"("key");

-- CreateIndex
CREATE INDEX "ngo_achievement_unlocks_ngo_id_idx" ON "ngo_achievement_unlocks"("ngo_id");

-- CreateIndex
CREATE UNIQUE INDEX "ngo_achievement_unlocks_ngo_id_achievement_id_key" ON "ngo_achievement_unlocks"("ngo_id", "achievement_id");

-- AddForeignKey
ALTER TABLE "ngo_streak_history" ADD CONSTRAINT "ngo_streak_history_ngo_id_fkey" FOREIGN KEY ("ngo_id") REFERENCES "ngo_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ngo_achievement_unlocks" ADD CONSTRAINT "ngo_achievement_unlocks_ngo_id_fkey" FOREIGN KEY ("ngo_id") REFERENCES "ngo_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ngo_achievement_unlocks" ADD CONSTRAINT "ngo_achievement_unlocks_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "ngo_achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
