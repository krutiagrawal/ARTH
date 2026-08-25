-- CreateEnum
CREATE TYPE "TreeHealthStatus" AS ENUM ('healthy', 'struggling', 'dead', 'removed');

-- AlterTable
ALTER TABLE "drives" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ngo_profiles" ADD COLUMN     "awards" JSONB,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "founded_year" INTEGER,
ADD COLUMN     "volunteer_count_estimate" INTEGER;

-- CreateTable
CREATE TABLE "follows" (
    "id" TEXT NOT NULL,
    "follower_id" TEXT NOT NULL,
    "ngo_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ngo_updates" (
    "id" TEXT NOT NULL,
    "ngo_id" TEXT NOT NULL,
    "drive_id" TEXT,
    "caption" TEXT,
    "photo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ngo_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_members" (
    "id" TEXT NOT NULL,
    "ngo_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "photo_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planted_trees" (
    "id" TEXT NOT NULL,
    "ngo_id" TEXT NOT NULL,
    "drive_id" TEXT,
    "species_name" TEXT NOT NULL,
    "label" TEXT,
    "planted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location_label" TEXT,
    "lat" DECIMAL(9,6),
    "lng" DECIMAL(9,6),
    "photo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planted_trees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tree_health_checks" (
    "id" TEXT NOT NULL,
    "planted_tree_id" TEXT NOT NULL,
    "status" "TreeHealthStatus" NOT NULL,
    "notes" TEXT,
    "photo_url" TEXT,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tree_health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "follows_ngo_id_idx" ON "follows"("ngo_id");

-- CreateIndex
CREATE INDEX "follows_follower_id_idx" ON "follows"("follower_id");

-- CreateIndex
CREATE UNIQUE INDEX "follows_follower_id_ngo_id_key" ON "follows"("follower_id", "ngo_id");

-- CreateIndex
CREATE INDEX "ngo_updates_ngo_id_created_at_idx" ON "ngo_updates"("ngo_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ngo_updates_drive_id_idx" ON "ngo_updates"("drive_id");

-- CreateIndex
CREATE INDEX "staff_members_ngo_id_idx" ON "staff_members"("ngo_id");

-- CreateIndex
CREATE INDEX "planted_trees_ngo_id_idx" ON "planted_trees"("ngo_id");

-- CreateIndex
CREATE INDEX "planted_trees_drive_id_idx" ON "planted_trees"("drive_id");

-- CreateIndex
CREATE INDEX "planted_trees_planted_at_idx" ON "planted_trees"("planted_at");

-- CreateIndex
CREATE INDEX "tree_health_checks_planted_tree_id_checked_at_idx" ON "tree_health_checks"("planted_tree_id", "checked_at" DESC);

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_ngo_id_fkey" FOREIGN KEY ("ngo_id") REFERENCES "ngo_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ngo_updates" ADD CONSTRAINT "ngo_updates_ngo_id_fkey" FOREIGN KEY ("ngo_id") REFERENCES "ngo_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ngo_updates" ADD CONSTRAINT "ngo_updates_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "drives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_ngo_id_fkey" FOREIGN KEY ("ngo_id") REFERENCES "ngo_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planted_trees" ADD CONSTRAINT "planted_trees_ngo_id_fkey" FOREIGN KEY ("ngo_id") REFERENCES "ngo_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planted_trees" ADD CONSTRAINT "planted_trees_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "drives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tree_health_checks" ADD CONSTRAINT "tree_health_checks_planted_tree_id_fkey" FOREIGN KEY ("planted_tree_id") REFERENCES "planted_trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
