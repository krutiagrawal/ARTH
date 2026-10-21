-- AlterEnum
ALTER TYPE "NgoStreakType" ADD VALUE 'learning';
ALTER TYPE "NgoStreakType" ADD VALUE 'protection';
ALTER TYPE "NurseryStreakType" ADD VALUE 'learning';
ALTER TYPE "NurseryStreakType" ADD VALUE 'protection';

-- AlterTable
ALTER TABLE "ngo_contribution_streaks" ADD COLUMN "protected_by" "StreakProtectedBy";
ALTER TABLE "nursery_contribution_streaks" ADD COLUMN "protected_by" "StreakProtectedBy";
