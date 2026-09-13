-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'delivery_partner';

-- AlterTable
ALTER TABLE "delivery_tracking" ADD COLUMN     "delivery_partner_id" TEXT;

-- AlterTable
ALTER TABLE "order_reviews" ADD COLUMN     "delivery_partner_id" TEXT;

-- CreateTable
CREATE TABLE "delivery_partner_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "nursery_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "photo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "avg_rating" DECIMAL(3,2),
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_partner_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_partner_profiles_user_id_key" ON "delivery_partner_profiles"("user_id");

-- CreateIndex
CREATE INDEX "delivery_partner_profiles_nursery_id_idx" ON "delivery_partner_profiles"("nursery_id");

-- CreateIndex
CREATE INDEX "delivery_tracking_delivery_partner_id_idx" ON "delivery_tracking"("delivery_partner_id");

-- CreateIndex
CREATE INDEX "order_reviews_delivery_partner_id_idx" ON "order_reviews"("delivery_partner_id");

-- AddForeignKey
ALTER TABLE "delivery_partner_profiles" ADD CONSTRAINT "delivery_partner_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_partner_profiles" ADD CONSTRAINT "delivery_partner_profiles_nursery_id_fkey" FOREIGN KEY ("nursery_id") REFERENCES "nursery_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_tracking" ADD CONSTRAINT "delivery_tracking_delivery_partner_id_fkey" FOREIGN KEY ("delivery_partner_id") REFERENCES "delivery_partner_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_reviews" ADD CONSTRAINT "order_reviews_delivery_partner_id_fkey" FOREIGN KEY ("delivery_partner_id") REFERENCES "delivery_partner_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
