-- AlterTable
ALTER TABLE "tree_species" ADD COLUMN "created_by_user_id" TEXT;

-- CreateIndex
CREATE INDEX "tree_species_created_by_user_id_idx" ON "tree_species"("created_by_user_id");
