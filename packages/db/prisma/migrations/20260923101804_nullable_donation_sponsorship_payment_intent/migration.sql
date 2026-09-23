-- AlterTable
ALTER TABLE "donations" ALTER COLUMN "stripe_payment_intent_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "drive_plant_sponsorships" ALTER COLUMN "stripe_payment_intent_id" DROP NOT NULL;
