-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('family', 'school', 'club', 'other');

-- CreateEnum
CREATE TYPE "GroupMemberRole" AS ENUM ('owner', 'co_admin', 'member');

-- CreateEnum
CREATE TYPE "GroupStatus" AS ENUM ('active', 'suspended');

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('user', 'ngo', 'group', 'nursery', 'corporate', 'admin');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user';
COMMIT;

-- CreateTable
CREATE TABLE "group_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "group_name" TEXT NOT NULL,
    "group_type" "GroupType" NOT NULL DEFAULT 'other',
    "description" TEXT NOT NULL,
    "logo_url" TEXT,
    "city" TEXT,
    "invite_code" TEXT NOT NULL,
    "status" "GroupStatus" NOT NULL DEFAULT 'active',
    "streak_current" INTEGER NOT NULL DEFAULT 0,
    "streak_max" INTEGER NOT NULL DEFAULT 0,
    "badges_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "GroupMemberRole" NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_challenges" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "goal_type" "ChallengeGoalType" NOT NULL,
    "goal_total" INTEGER NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_challenge_participants" (
    "id" TEXT NOT NULL,
    "challenge_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "group_challenge_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "group_profiles_user_id_key" ON "group_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_profiles_invite_code_key" ON "group_profiles"("invite_code");

-- CreateIndex
CREATE INDEX "group_profiles_status_idx" ON "group_profiles"("status");

-- CreateIndex
CREATE INDEX "group_members_group_id_idx" ON "group_members"("group_id");

-- CreateIndex
CREATE INDEX "group_members_user_id_idx" ON "group_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_group_id_user_id_key" ON "group_members"("group_id", "user_id");

-- CreateIndex
CREATE INDEX "group_challenges_group_id_idx" ON "group_challenges"("group_id");

-- CreateIndex
CREATE INDEX "group_challenge_participants_user_id_idx" ON "group_challenge_participants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_challenge_participants_challenge_id_user_id_key" ON "group_challenge_participants"("challenge_id", "user_id");

-- AddForeignKey
ALTER TABLE "group_profiles" ADD CONSTRAINT "group_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "group_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_challenges" ADD CONSTRAINT "group_challenges_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "group_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_challenges" ADD CONSTRAINT "group_challenges_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_challenge_participants" ADD CONSTRAINT "group_challenge_participants_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "group_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_challenge_participants" ADD CONSTRAINT "group_challenge_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

