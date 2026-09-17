-- AlterTable
ALTER TABLE "donations" ADD COLUMN     "receipt_number" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "donations_receipt_number_key" ON "donations"("receipt_number");
