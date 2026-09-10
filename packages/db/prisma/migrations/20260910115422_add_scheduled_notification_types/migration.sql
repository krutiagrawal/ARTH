-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'streak_at_risk';
ALTER TYPE "NotificationType" ADD VALUE 'streak_broken';
ALTER TYPE "NotificationType" ADD VALUE 'reengagement_nudge';
ALTER TYPE "NotificationType" ADD VALUE 'cart_abandoned';
