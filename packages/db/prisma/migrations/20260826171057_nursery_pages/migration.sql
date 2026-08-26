-- CreateEnum
CREATE TYPE "NurseryAchievementCriteriaType" AS ENUM ('species_listed', 'saplings_given_out', 'reservations_fulfilled', 'streak_days');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('pending', 'fulfilled', 'declined', 'cancelled');

-- CreateEnum
CREATE TYPE "StockLedgerReason" AS ENUM ('manual_add', 'manual_adjust', 'manual_remove', 'reservation_fulfilled');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'reservation_requested';
ALTER TYPE "NotificationType" ADD VALUE 'reservation_fulfilled';
ALTER TYPE "NotificationType" ADD VALUE 'reservation_declined';

-- AlterTable
ALTER TABLE "nursery_profiles" ADD COLUMN     "lat" DECIMAL(9,6),
ADD COLUMN     "lng" DECIMAL(9,6);

-- CreateTable
CREATE TABLE "sapling_reservations" (
    "id" TEXT NOT NULL,
    "stock_id" TEXT NOT NULL,
    "nursery_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "sapling_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sapling_stock_ledger" (
    "id" TEXT NOT NULL,
    "nursery_id" TEXT NOT NULL,
    "stock_id" TEXT,
    "species" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "StockLedgerReason" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sapling_stock_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nursery_streak_history" (
    "id" TEXT NOT NULL,
    "nursery_id" TEXT NOT NULL,
    "activity_date" DATE NOT NULL,
    "planted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nursery_streak_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nursery_achievements" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "rarity" "Rarity" NOT NULL,
    "criteria_type" "NurseryAchievementCriteriaType" NOT NULL,
    "criteria_target" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "nursery_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nursery_achievement_unlocks" (
    "id" TEXT NOT NULL,
    "nursery_id" TEXT NOT NULL,
    "achievement_id" TEXT NOT NULL,
    "unlocked" BOOLEAN NOT NULL DEFAULT false,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "unlocked_at" TIMESTAMP(3),

    CONSTRAINT "nursery_achievement_unlocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sapling_reservations_nursery_id_status_idx" ON "sapling_reservations"("nursery_id", "status");

-- CreateIndex
CREATE INDEX "sapling_reservations_user_id_idx" ON "sapling_reservations"("user_id");

-- CreateIndex
CREATE INDEX "sapling_stock_ledger_nursery_id_created_at_idx" ON "sapling_stock_ledger"("nursery_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "nursery_streak_history_nursery_id_activity_date_idx" ON "nursery_streak_history"("nursery_id", "activity_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "nursery_streak_history_nursery_id_activity_date_key" ON "nursery_streak_history"("nursery_id", "activity_date");

-- CreateIndex
CREATE UNIQUE INDEX "nursery_achievements_key_key" ON "nursery_achievements"("key");

-- CreateIndex
CREATE INDEX "nursery_achievement_unlocks_nursery_id_idx" ON "nursery_achievement_unlocks"("nursery_id");

-- CreateIndex
CREATE UNIQUE INDEX "nursery_achievement_unlocks_nursery_id_achievement_id_key" ON "nursery_achievement_unlocks"("nursery_id", "achievement_id");

-- AddForeignKey
ALTER TABLE "sapling_reservations" ADD CONSTRAINT "sapling_reservations_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "sapling_stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sapling_reservations" ADD CONSTRAINT "sapling_reservations_nursery_id_fkey" FOREIGN KEY ("nursery_id") REFERENCES "nursery_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sapling_reservations" ADD CONSTRAINT "sapling_reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sapling_stock_ledger" ADD CONSTRAINT "sapling_stock_ledger_nursery_id_fkey" FOREIGN KEY ("nursery_id") REFERENCES "nursery_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sapling_stock_ledger" ADD CONSTRAINT "sapling_stock_ledger_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "sapling_stock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursery_streak_history" ADD CONSTRAINT "nursery_streak_history_nursery_id_fkey" FOREIGN KEY ("nursery_id") REFERENCES "nursery_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursery_achievement_unlocks" ADD CONSTRAINT "nursery_achievement_unlocks_nursery_id_fkey" FOREIGN KEY ("nursery_id") REFERENCES "nursery_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursery_achievement_unlocks" ADD CONSTRAINT "nursery_achievement_unlocks_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "nursery_achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

