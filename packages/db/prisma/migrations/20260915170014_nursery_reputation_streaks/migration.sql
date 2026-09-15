-- CreateEnum
CREATE TYPE "NurseryGrowthLevel" AS ENUM ('seedling', 'growing', 'established', 'evergreen');

-- CreateEnum
CREATE TYPE "NurseryStreakType" AS ENUM ('supply', 'inventory_freshness', 'arth_contribution');

-- DropForeignKey
ALTER TABLE "nursery_streak_history" DROP CONSTRAINT "nursery_streak_history_nursery_id_fkey";

-- AlterTable
ALTER TABLE "nursery_profiles" DROP COLUMN "streak_current",
DROP COLUMN "streak_max",
ADD COLUMN     "fulfilment_streak_max" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "growth_level" "NurseryGrowthLevel" NOT NULL DEFAULT 'seedling',
ADD COLUMN     "trust_score" INTEGER;

-- DropTable
DROP TABLE "nursery_streak_history";

-- CreateTable
CREATE TABLE "nursery_contribution_streaks" (
    "id" TEXT NOT NULL,
    "nursery_id" TEXT NOT NULL,
    "streak_type" "NurseryStreakType" NOT NULL,
    "period_start" DATE NOT NULL,
    "met_criteria" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nursery_contribution_streaks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nursery_contribution_streaks_nursery_id_streak_type_period__idx" ON "nursery_contribution_streaks"("nursery_id", "streak_type", "period_start" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "nursery_contribution_streaks_nursery_id_streak_type_period__key" ON "nursery_contribution_streaks"("nursery_id", "streak_type", "period_start");

-- AddForeignKey
ALTER TABLE "nursery_contribution_streaks" ADD CONSTRAINT "nursery_contribution_streaks_nursery_id_fkey" FOREIGN KEY ("nursery_id") REFERENCES "nursery_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

