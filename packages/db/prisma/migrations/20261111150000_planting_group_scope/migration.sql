-- AlterTable
ALTER TABLE "planting_groups" ADD COLUMN     "selected_forest_theme_id" TEXT;

-- AlterTable
ALTER TABLE "planting_group_members" ADD COLUMN     "share_activity" BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE "planting_groups" ADD CONSTRAINT "planting_groups_selected_forest_theme_id_fkey" FOREIGN KEY ("selected_forest_theme_id") REFERENCES "forest_themes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

