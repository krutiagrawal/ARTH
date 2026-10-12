-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ngo_tree_released';

-- A released adopter's check-ins and approved community updates are archived (hidden from the next
-- adopter's timeline) rather than deleted, so the NGO keeps the full history.
ALTER TABLE "tree_observations" ADD COLUMN "archived_at" TIMESTAMP(3);
