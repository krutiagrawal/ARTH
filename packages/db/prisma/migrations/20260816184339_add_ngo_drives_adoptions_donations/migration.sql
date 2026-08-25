-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'ngo', 'admin');

-- CreateEnum
CREATE TYPE "NgoApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "DriveStatus" AS ENUM ('upcoming', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('confirmed', 'cancelled');

-- CreateEnum
CREATE TYPE "AdoptableTreeStatus" AS ENUM ('available', 'adopted', 'removed');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('active', 'closed');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('pending', 'succeeded', 'failed', 'refunded');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'user';

-- CreateTable
CREATE TABLE "ngo_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "org_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "website" TEXT,
    "contact_phone" TEXT,
    "logo_url" TEXT,
    "status" "NgoApprovalStatus" NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ngo_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drives" (
    "id" TEXT NOT NULL,
    "ngo_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "photo_url" TEXT,
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "location_label" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER,
    "capacity" INTEGER,
    "status" "DriveStatus" NOT NULL DEFAULT 'upcoming',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drive_rsvps" (
    "id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "RsvpStatus" NOT NULL DEFAULT 'confirmed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drive_rsvps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adoptable_trees" (
    "id" TEXT NOT NULL,
    "ngo_id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "species_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "photo_url" TEXT,
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "location_label" TEXT,
    "status" "AdoptableTreeStatus" NOT NULL DEFAULT 'available',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adoptable_trees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adoptions" (
    "id" TEXT NOT NULL,
    "adoptable_tree_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adoptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donation_campaigns" (
    "id" TEXT NOT NULL,
    "ngo_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "goal_amount_cents" INTEGER,
    "cover_photo_url" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donation_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donations" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'inr',
    "stripe_payment_intent_id" TEXT NOT NULL,
    "status" "DonationStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ngo_profiles_user_id_key" ON "ngo_profiles"("user_id");

-- CreateIndex
CREATE INDEX "ngo_profiles_status_idx" ON "ngo_profiles"("status");

-- CreateIndex
CREATE INDEX "drives_ngo_id_idx" ON "drives"("ngo_id");

-- CreateIndex
CREATE INDEX "drives_lat_lng_idx" ON "drives"("lat", "lng");

-- CreateIndex
CREATE INDEX "drives_starts_at_idx" ON "drives"("starts_at");

-- CreateIndex
CREATE INDEX "drive_rsvps_drive_id_idx" ON "drive_rsvps"("drive_id");

-- CreateIndex
CREATE INDEX "drive_rsvps_user_id_idx" ON "drive_rsvps"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "drive_rsvps_drive_id_user_id_key" ON "drive_rsvps"("drive_id", "user_id");

-- CreateIndex
CREATE INDEX "adoptable_trees_ngo_id_idx" ON "adoptable_trees"("ngo_id");

-- CreateIndex
CREATE INDEX "adoptable_trees_lat_lng_idx" ON "adoptable_trees"("lat", "lng");

-- CreateIndex
CREATE UNIQUE INDEX "adoptions_adoptable_tree_id_key" ON "adoptions"("adoptable_tree_id");

-- CreateIndex
CREATE INDEX "adoptions_user_id_idx" ON "adoptions"("user_id");

-- CreateIndex
CREATE INDEX "donation_campaigns_ngo_id_idx" ON "donation_campaigns"("ngo_id");

-- CreateIndex
CREATE UNIQUE INDEX "donations_stripe_payment_intent_id_key" ON "donations"("stripe_payment_intent_id");

-- CreateIndex
CREATE INDEX "donations_campaign_id_idx" ON "donations"("campaign_id");

-- CreateIndex
CREATE INDEX "donations_user_id_idx" ON "donations"("user_id");

-- AddForeignKey
ALTER TABLE "ngo_profiles" ADD CONSTRAINT "ngo_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drives" ADD CONSTRAINT "drives_ngo_id_fkey" FOREIGN KEY ("ngo_id") REFERENCES "ngo_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_rsvps" ADD CONSTRAINT "drive_rsvps_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "drives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_rsvps" ADD CONSTRAINT "drive_rsvps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adoptable_trees" ADD CONSTRAINT "adoptable_trees_ngo_id_fkey" FOREIGN KEY ("ngo_id") REFERENCES "ngo_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adoptions" ADD CONSTRAINT "adoptions_adoptable_tree_id_fkey" FOREIGN KEY ("adoptable_tree_id") REFERENCES "adoptable_trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adoptions" ADD CONSTRAINT "adoptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_campaigns" ADD CONSTRAINT "donation_campaigns_ngo_id_fkey" FOREIGN KEY ("ngo_id") REFERENCES "ngo_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "donation_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
