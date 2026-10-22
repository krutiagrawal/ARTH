-- AlterTable "drives": which cancelled drive a relaunched drive replaces.
ALTER TABLE "drives" ADD COLUMN "relaunched_from_id" TEXT;

-- AddForeignKey
ALTER TABLE "drives" ADD CONSTRAINT "drives_relaunched_from_id_fkey" FOREIGN KEY ("relaunched_from_id") REFERENCES "drives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "drives_relaunched_from_id_idx" ON "drives"("relaunched_from_id");
