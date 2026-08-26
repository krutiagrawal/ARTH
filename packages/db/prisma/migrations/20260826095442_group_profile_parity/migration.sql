-- AlterEnum
ALTER TYPE "PostAuthorType" ADD VALUE 'group';

-- AlterTable
ALTER TABLE "group_profiles" ADD COLUMN     "avatar_emoji" TEXT,
ADD COLUMN     "handle" TEXT,
ADD COLUMN     "selected_forest_theme_id" TEXT;

-- AlterTable
ALTER TABLE "stories" ADD COLUMN     "group_id" TEXT;

-- CreateTable
CREATE TABLE "group_forest_themes" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "theme_id" TEXT NOT NULL,
    "unlocked" BOOLEAN NOT NULL DEFAULT false,
    "unlocked_at" TIMESTAMP(3),

    CONSTRAINT "group_forest_themes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_forest_themes_group_id_idx" ON "group_forest_themes"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_forest_themes_group_id_theme_id_key" ON "group_forest_themes"("group_id", "theme_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_profiles_handle_key" ON "group_profiles"("handle");

-- CreateIndex
CREATE INDEX "stories_group_id_idx" ON "stories"("group_id");

-- AddForeignKey
ALTER TABLE "group_profiles" ADD CONSTRAINT "group_profiles_selected_forest_theme_id_fkey" FOREIGN KEY ("selected_forest_theme_id") REFERENCES "forest_themes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_forest_themes" ADD CONSTRAINT "group_forest_themes_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "group_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_forest_themes" ADD CONSTRAINT "group_forest_themes_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "forest_themes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "group_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

