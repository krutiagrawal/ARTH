-- AlterTable
ALTER TABLE "blocks" ADD COLUMN "blocked_nursery_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "blocks_blocker_id_blocked_nursery_id_key" ON "blocks"("blocker_id", "blocked_nursery_id");

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_nursery_id_fkey" FOREIGN KEY ("blocked_nursery_id") REFERENCES "nursery_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
