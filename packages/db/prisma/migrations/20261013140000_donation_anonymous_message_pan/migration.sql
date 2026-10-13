-- AlterTable
ALTER TABLE "donations" ADD COLUMN "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "message" TEXT,
ADD COLUMN "donor_pan" TEXT;
