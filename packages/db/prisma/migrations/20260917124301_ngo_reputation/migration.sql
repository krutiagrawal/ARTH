-- CreateEnum
CREATE TYPE "NgoGrowthLevel" AS ENUM ('seedling', 'growing', 'established', 'evergreen');

-- CreateEnum
CREATE TYPE "NgoStreakType" AS ENUM ('updates', 'drive_activity', 'impact_verification');

-- AlterTable
ALTER TABLE "ngo_profiles"
ADD COLUMN     "growth_level" "NgoGrowthLevel" NOT NULL DEFAULT 'seedling',
ADD COLUMN     "trust_score" INTEGER;

-- CreateTable
CREATE TABLE "ngo_contribution_streaks" (
    "id" TEXT NOT NULL,
    "ngo_id" TEXT NOT NULL,
    "streak_type" "NgoStreakType" NOT NULL,
    "period_start" DATE NOT NULL,
    "met_criteria" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ngo_contribution_streaks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ngo_contribution_streaks_ngo_id_streak_type_period_start_idx" ON "ngo_contribution_streaks"("ngo_id", "streak_type", "period_start" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ngo_contribution_streaks_ngo_id_streak_type_period_start_key" ON "ngo_contribution_streaks"("ngo_id", "streak_type", "period_start");

-- AddForeignKey
ALTER TABLE "ngo_contribution_streaks" ADD CONSTRAINT "ngo_contribution_streaks_ngo_id_fkey" FOREIGN KEY ("ngo_id") REFERENCES "ngo_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: carry existing weekly "posted an update" history over as the 'updates' streak type
-- before the old single-purpose table is dropped, so no NGO loses their current streak.
INSERT INTO "ngo_contribution_streaks" ("id", "ngo_id", "streak_type", "period_start", "met_criteria", "created_at")
SELECT gen_random_uuid(), "ngo_id", 'updates', "week_start", "posted", "created_at"
FROM "ngo_streak_history";

-- DropForeignKey
ALTER TABLE "ngo_streak_history" DROP CONSTRAINT "ngo_streak_history_ngo_id_fkey";

-- DropTable
DROP TABLE "ngo_streak_history";

-- AlterTable
ALTER TABLE "ngo_profiles" DROP COLUMN "streak_current",
DROP COLUMN "streak_max";
