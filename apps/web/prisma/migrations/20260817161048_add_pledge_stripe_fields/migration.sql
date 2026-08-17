-- CreateEnum
CREATE TYPE "PledgeStatus" AS ENUM ('pending', 'paid', 'failed');

-- AlterTable
ALTER TABLE "Pledge" ADD COLUMN "status" "PledgeStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN "stripeSessionId" TEXT,
ADD COLUMN "stripePaymentIntentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Pledge_stripeSessionId_key" ON "Pledge"("stripeSessionId");
