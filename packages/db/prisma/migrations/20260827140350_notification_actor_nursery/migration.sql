-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "actor_nursery_id" TEXT;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_nursery_id_fkey" FOREIGN KEY ("actor_nursery_id") REFERENCES "nursery_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
