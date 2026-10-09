-- AlterEnum
ALTER TYPE "GameKey" ADD VALUE 'daily_lesson';

-- CreateTable
CREATE TABLE "daily_lessons" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "read_minutes" INTEGER NOT NULL DEFAULT 3,
    "sections" JSONB NOT NULL,
    "takeaway" TEXT,
    "quiz" JSONB NOT NULL,
    "source_note" TEXT,
    "publish_on" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_lesson_picks" (
    "id" TEXT NOT NULL,
    "play_date" DATE NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_lesson_picks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_lessons_key_key" ON "daily_lessons"("key");

-- CreateIndex
CREATE UNIQUE INDEX "daily_lesson_picks_play_date_key" ON "daily_lesson_picks"("play_date");

-- AddForeignKey
ALTER TABLE "daily_lesson_picks" ADD CONSTRAINT "daily_lesson_picks_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "daily_lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
