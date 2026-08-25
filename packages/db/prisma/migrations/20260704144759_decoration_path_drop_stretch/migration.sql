-- AlterTable
ALTER TABLE "decoration_placements" DROP COLUMN "stretch",
ADD COLUMN     "path" JSONB;
