-- CreateEnum
CREATE TYPE "GroupAchievementCriteriaType" AS ENUM ('trees_planted', 'member_count', 'streak_days', 'co2_absorbed', 'challenges_completed');

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "group_id" TEXT;

-- CreateTable
CREATE TABLE "nursery_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "nursery_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "logo_url" TEXT,
    "city" TEXT,
    "contact_phone" TEXT,
    "status" "NgoApprovalStatus" NOT NULL DEFAULT 'pending',
    "streak_current" INTEGER NOT NULL DEFAULT 0,
    "streak_max" INTEGER NOT NULL DEFAULT 0,
    "badges_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nursery_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sapling_stock" (
    "id" TEXT NOT NULL,
    "nursery_id" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "is_free" BOOLEAN NOT NULL DEFAULT true,
    "price_cents" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sapling_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "logo_url" TEXT,
    "city" TEXT,
    "industry" TEXT,
    "status" "NgoApprovalStatus" NOT NULL DEFAULT 'pending',
    "streak_current" INTEGER NOT NULL DEFAULT 0,
    "streak_max" INTEGER NOT NULL DEFAULT 0,
    "badges_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporate_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "csr_sponsorships" (
    "id" TEXT NOT NULL,
    "corporate_id" TEXT NOT NULL,
    "drive_id" TEXT,
    "amount_cents" INTEGER NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "csr_sponsorships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_streak_history" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "activity_date" DATE NOT NULL,
    "planted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_streak_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_achievements" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "rarity" "Rarity" NOT NULL,
    "criteria_type" "GroupAchievementCriteriaType" NOT NULL,
    "criteria_target" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "group_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_achievement_unlocks" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "achievement_id" TEXT NOT NULL,
    "unlocked" BOOLEAN NOT NULL DEFAULT false,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "unlocked_at" TIMESTAMP(3),

    CONSTRAINT "group_achievement_unlocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nursery_profiles_user_id_key" ON "nursery_profiles"("user_id");

-- CreateIndex
CREATE INDEX "nursery_profiles_status_idx" ON "nursery_profiles"("status");

-- CreateIndex
CREATE INDEX "sapling_stock_nursery_id_idx" ON "sapling_stock"("nursery_id");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_profiles_user_id_key" ON "corporate_profiles"("user_id");

-- CreateIndex
CREATE INDEX "corporate_profiles_status_idx" ON "corporate_profiles"("status");

-- CreateIndex
CREATE INDEX "csr_sponsorships_corporate_id_idx" ON "csr_sponsorships"("corporate_id");

-- CreateIndex
CREATE INDEX "csr_sponsorships_drive_id_idx" ON "csr_sponsorships"("drive_id");

-- CreateIndex
CREATE INDEX "group_streak_history_group_id_activity_date_idx" ON "group_streak_history"("group_id", "activity_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "group_streak_history_group_id_activity_date_key" ON "group_streak_history"("group_id", "activity_date");

-- CreateIndex
CREATE UNIQUE INDEX "group_achievements_key_key" ON "group_achievements"("key");

-- CreateIndex
CREATE INDEX "group_achievement_unlocks_group_id_idx" ON "group_achievement_unlocks"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_achievement_unlocks_group_id_achievement_id_key" ON "group_achievement_unlocks"("group_id", "achievement_id");

-- CreateIndex
CREATE INDEX "posts_group_id_created_at_idx" ON "posts"("group_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "nursery_profiles" ADD CONSTRAINT "nursery_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sapling_stock" ADD CONSTRAINT "sapling_stock_nursery_id_fkey" FOREIGN KEY ("nursery_id") REFERENCES "nursery_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_profiles" ADD CONSTRAINT "corporate_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "csr_sponsorships" ADD CONSTRAINT "csr_sponsorships_corporate_id_fkey" FOREIGN KEY ("corporate_id") REFERENCES "corporate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "csr_sponsorships" ADD CONSTRAINT "csr_sponsorships_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "drives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "group_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_streak_history" ADD CONSTRAINT "group_streak_history_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "group_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_achievement_unlocks" ADD CONSTRAINT "group_achievement_unlocks_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "group_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_achievement_unlocks" ADD CONSTRAINT "group_achievement_unlocks_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "group_achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
