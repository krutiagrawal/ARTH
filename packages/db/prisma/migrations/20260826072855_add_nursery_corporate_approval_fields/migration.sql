-- AlterTable
ALTER TABLE "corporate_profiles" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by_user_id" TEXT,
ADD COLUMN     "rejection_reason" TEXT;

-- AlterTable
ALTER TABLE "nursery_profiles" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by_user_id" TEXT,
ADD COLUMN     "rejection_reason" TEXT;
