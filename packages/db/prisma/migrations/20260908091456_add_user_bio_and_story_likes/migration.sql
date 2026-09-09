-- AlterTable
ALTER TABLE "stories" ADD COLUMN     "like_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bio" VARCHAR(160);

-- CreateTable
CREATE TABLE "story_likes" (
    "id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "story_likes_story_id_idx" ON "story_likes"("story_id");

-- CreateIndex
CREATE INDEX "story_likes_user_id_idx" ON "story_likes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "story_likes_story_id_user_id_key" ON "story_likes"("story_id", "user_id");

-- AddForeignKey
ALTER TABLE "story_likes" ADD CONSTRAINT "story_likes_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_likes" ADD CONSTRAINT "story_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
