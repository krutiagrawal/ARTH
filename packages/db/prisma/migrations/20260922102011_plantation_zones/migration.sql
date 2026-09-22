-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ngo_health_check_due';

-- AlterEnum
ALTER TYPE "TreeHealthStatus" ADD VALUE 'not_checked';

-- AlterTable
ALTER TABLE "planted_trees" ADD COLUMN     "zone_id" TEXT;

-- CreateTable
CREATE TABLE "plantation_zones" (
    "id" TEXT NOT NULL,
    "ngo_id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plantation_zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plantation_zones_ngo_id_idx" ON "plantation_zones"("ngo_id");

-- CreateIndex
CREATE UNIQUE INDEX "plantation_zones_drive_id_name_key" ON "plantation_zones"("drive_id", "name");

-- CreateIndex
CREATE INDEX "planted_trees_zone_id_idx" ON "planted_trees"("zone_id");

-- AddForeignKey
ALTER TABLE "planted_trees" ADD CONSTRAINT "planted_trees_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "plantation_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantation_zones" ADD CONSTRAINT "plantation_zones_ngo_id_fkey" FOREIGN KEY ("ngo_id") REFERENCES "ngo_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantation_zones" ADD CONSTRAINT "plantation_zones_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "drives"("id") ON DELETE CASCADE ON UPDATE CASCADE;
