-- CreateEnum
CREATE TYPE "PlantingGroupActivityType" AS ENUM ('member_joined', 'member_left', 'tree_planted', 'tree_adopted', 'donation_made', 'challenge_created', 'role_changed');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'group_challenge_created';

-- AlterTable
ALTER TABLE "trees" ADD COLUMN     "planting_group_id" TEXT;

-- AlterTable
ALTER TABLE "adoptions" ADD COLUMN     "planting_group_id" TEXT;

-- AlterTable
ALTER TABLE "donations" ADD COLUMN     "planting_group_id" TEXT;

-- CreateTable
CREATE TABLE "planting_group_challenges" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "goal_total" INTEGER NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planting_group_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planting_group_activity" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "type" "PlantingGroupActivityType" NOT NULL,
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planting_group_activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "planting_group_challenges_group_id_ends_at_idx" ON "planting_group_challenges"("group_id", "ends_at");

-- CreateIndex
CREATE INDEX "planting_group_activity_group_id_created_at_idx" ON "planting_group_activity"("group_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "planting_group_activity_actor_id_idx" ON "planting_group_activity"("actor_id");

-- CreateIndex
CREATE INDEX "trees_planting_group_id_idx" ON "trees"("planting_group_id");

-- CreateIndex
CREATE INDEX "adoptions_planting_group_id_idx" ON "adoptions"("planting_group_id");

-- CreateIndex
CREATE INDEX "donations_planting_group_id_idx" ON "donations"("planting_group_id");

-- AddForeignKey
ALTER TABLE "trees" ADD CONSTRAINT "trees_planting_group_id_fkey" FOREIGN KEY ("planting_group_id") REFERENCES "planting_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adoptions" ADD CONSTRAINT "adoptions_planting_group_id_fkey" FOREIGN KEY ("planting_group_id") REFERENCES "planting_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_planting_group_id_fkey" FOREIGN KEY ("planting_group_id") REFERENCES "planting_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planting_group_challenges" ADD CONSTRAINT "planting_group_challenges_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "planting_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planting_group_challenges" ADD CONSTRAINT "planting_group_challenges_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planting_group_activity" ADD CONSTRAINT "planting_group_activity_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "planting_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planting_group_activity" ADD CONSTRAINT "planting_group_activity_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

