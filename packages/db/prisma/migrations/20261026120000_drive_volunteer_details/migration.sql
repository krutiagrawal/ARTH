-- AlterTable "drives": practical details for volunteers.
ALTER TABLE "drives"
  ADD COLUMN "what_to_bring" TEXT,
  ADD COLUMN "provided_by_ngo" TEXT,
  ADD COLUMN "contact_name" TEXT,
  ADD COLUMN "contact_phone" TEXT,
  ADD COLUMN "min_age" INTEGER,
  ADD COLUMN "effort_level" TEXT;
