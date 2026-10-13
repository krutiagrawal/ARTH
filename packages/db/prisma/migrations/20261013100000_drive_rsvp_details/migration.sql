-- AlterTable
ALTER TABLE "drive_rsvps" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "emergency_contact_name" TEXT,
ADD COLUMN     "emergency_contact_phone" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "pickup_point_id" TEXT;

-- AddForeignKey
ALTER TABLE "drive_rsvps" ADD CONSTRAINT "drive_rsvps_pickup_point_id_fkey" FOREIGN KEY ("pickup_point_id") REFERENCES "drive_pickup_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;
