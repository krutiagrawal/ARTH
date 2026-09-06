-- AlterEnum
ALTER TYPE "PostAuthorType" ADD VALUE 'nursery';

-- AlterTable
ALTER TABLE "follows" ADD COLUMN     "nursery_id" TEXT,
ALTER COLUMN "ngo_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "nursery_id" TEXT;

-- AlterTable
ALTER TABLE "stories" ADD COLUMN     "nursery_id" TEXT;

-- CreateIndex
CREATE INDEX "follows_nursery_id_status_idx" ON "follows"("nursery_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "follows_follower_id_nursery_id_key" ON "follows"("follower_id", "nursery_id");

-- CreateIndex
CREATE INDEX "posts_nursery_id_created_at_idx" ON "posts"("nursery_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "stories_nursery_id_idx" ON "stories"("nursery_id");

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_nursery_id_fkey" FOREIGN KEY ("nursery_id") REFERENCES "nursery_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_nursery_id_fkey" FOREIGN KEY ("nursery_id") REFERENCES "nursery_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_nursery_id_fkey" FOREIGN KEY ("nursery_id") REFERENCES "nursery_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

