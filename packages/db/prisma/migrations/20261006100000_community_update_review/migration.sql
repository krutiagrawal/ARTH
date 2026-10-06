-- CreateEnum
CREATE TYPE "ObservationReviewStatus" AS ENUM ('pending', 'accepted', 'rejected');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'tree_update_received';
ALTER TYPE "NotificationType" ADD VALUE 'tree_update_decided';

-- AlterTable
ALTER TABLE "tree_observations" ADD COLUMN     "review_status" "ObservationReviewStatus" NOT NULL DEFAULT 'accepted',
ADD COLUMN     "reviewed_at" TIMESTAMP(3);
