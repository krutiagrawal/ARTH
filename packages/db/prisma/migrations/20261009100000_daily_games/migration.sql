-- CreateEnum
CREATE TYPE "GameKey" AS ENUM ('guess_tree', 'grove_word', 'eco_quiz', 'grow_order');

-- CreateEnum
CREATE TYPE "GamePlayStatus" AS ENUM ('in_progress', 'won', 'lost', 'completed');

-- AlterEnum
ALTER TYPE "XpReason" ADD VALUE 'game_completed';

-- AlterTable
ALTER TABLE "streak_history" ADD COLUMN "game_played" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "game_plays" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "game_key" "GameKey" NOT NULL,
    "play_date" DATE NOT NULL,
    "status" "GamePlayStatus" NOT NULL DEFAULT 'in_progress',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "guesses" JSONB NOT NULL DEFAULT '[]',
    "xp_awarded" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_plays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_plays_user_id_play_date_idx" ON "game_plays"("user_id", "play_date");

-- CreateIndex
CREATE UNIQUE INDEX "game_plays_user_id_game_key_play_date_key" ON "game_plays"("user_id", "game_key", "play_date");

-- AddForeignKey
ALTER TABLE "game_plays" ADD CONSTRAINT "game_plays_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
