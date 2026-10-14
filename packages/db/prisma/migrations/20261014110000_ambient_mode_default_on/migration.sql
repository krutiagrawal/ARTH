-- AlterTable: Ambient Mode now gates birds/fireflies/particles, which previously always showed.
ALTER TABLE "user_settings" ALTER COLUMN "ambient_mode" SET DEFAULT true;

-- Keep existing users' experience unchanged (the old default was never read by the app).
UPDATE "user_settings" SET "ambient_mode" = true;
