-- AlterTable
ALTER TABLE "drives" ADD COLUMN "archived_at" TIMESTAMP(3);
ALTER TABLE "donation_campaigns" ADD COLUMN "archived_at" TIMESTAMP(3);
ALTER TABLE "adoptable_trees" ADD COLUMN "archived_at" TIMESTAMP(3);
