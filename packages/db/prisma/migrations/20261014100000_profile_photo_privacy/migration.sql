-- AlterTable
ALTER TABLE "users" ADD COLUMN "avatar_url" TEXT;

-- AlterTable
ALTER TABLE "user_settings"
  ADD COLUMN "show_city" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "show_stats" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "show_interests" BOOLEAN NOT NULL DEFAULT true;
