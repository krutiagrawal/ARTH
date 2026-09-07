-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReportTargetType" ADD VALUE 'nursery';
ALTER TYPE "ReportTargetType" ADD VALUE 'corporate';

-- AlterTable
ALTER TABLE "trees" ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by_admin_id" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "blocked_at" TIMESTAMP(3),
ADD COLUMN     "blocked_by_user_id" TEXT,
ADD COLUMN     "blocked_reason" TEXT,
ADD COLUMN     "is_blocked" BOOLEAN NOT NULL DEFAULT false;
