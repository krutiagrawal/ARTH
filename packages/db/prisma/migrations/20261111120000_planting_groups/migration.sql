-- CreateEnum
CREATE TYPE "PlantingGroupType" AS ENUM ('family', 'school', 'club', 'other');

-- CreateEnum
CREATE TYPE "PlantingGroupRole" AS ENUM ('admin', 'member');

-- CreateEnum
CREATE TYPE "PlantingGroupRequestKind" AS ENUM ('join_request', 'invitation');

-- CreateEnum
CREATE TYPE "PlantingGroupRequestStatus" AS ENUM ('pending', 'accepted', 'declined', 'cancelled');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'group_join_requested';
ALTER TYPE "NotificationType" ADD VALUE 'group_join_approved';
ALTER TYPE "NotificationType" ADD VALUE 'group_join_declined';
ALTER TYPE "NotificationType" ADD VALUE 'group_invited';
ALTER TYPE "NotificationType" ADD VALUE 'group_invite_accepted';
ALTER TYPE "NotificationType" ADD VALUE 'group_role_changed';
ALTER TYPE "NotificationType" ADD VALUE 'group_member_removed';

-- CreateTable
CREATE TABLE "planting_groups" (
    "id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "group_type" "PlantingGroupType" NOT NULL DEFAULT 'other',
    "description" TEXT NOT NULL,
    "logo_url" TEXT,
    "city" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planting_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planting_group_members" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "PlantingGroupRole" NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planting_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planting_group_requests" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" "PlantingGroupRequestKind" NOT NULL,
    "status" "PlantingGroupRequestStatus" NOT NULL DEFAULT 'pending',
    "initiated_by_id" TEXT NOT NULL,
    "responded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "planting_group_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "planting_groups_handle_key" ON "planting_groups"("handle");

-- CreateIndex
CREATE INDEX "planting_groups_created_by_id_idx" ON "planting_groups"("created_by_id");

-- CreateIndex
CREATE INDEX "planting_group_members_user_id_idx" ON "planting_group_members"("user_id");

-- CreateIndex
CREATE INDEX "planting_group_members_group_id_role_idx" ON "planting_group_members"("group_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "planting_group_members_group_id_user_id_key" ON "planting_group_members"("group_id", "user_id");

-- CreateIndex
CREATE INDEX "planting_group_requests_group_id_status_idx" ON "planting_group_requests"("group_id", "status");

-- CreateIndex
CREATE INDEX "planting_group_requests_user_id_status_idx" ON "planting_group_requests"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "planting_group_requests_group_id_user_id_key" ON "planting_group_requests"("group_id", "user_id");

-- AddForeignKey
ALTER TABLE "planting_groups" ADD CONSTRAINT "planting_groups_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planting_group_members" ADD CONSTRAINT "planting_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "planting_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planting_group_members" ADD CONSTRAINT "planting_group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planting_group_requests" ADD CONSTRAINT "planting_group_requests_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "planting_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planting_group_requests" ADD CONSTRAINT "planting_group_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planting_group_requests" ADD CONSTRAINT "planting_group_requests_initiated_by_id_fkey" FOREIGN KEY ("initiated_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planting_group_requests" ADD CONSTRAINT "planting_group_requests_responded_by_id_fkey" FOREIGN KEY ("responded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

