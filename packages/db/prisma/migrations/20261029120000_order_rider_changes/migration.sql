-- CreateTable
CREATE TABLE "order_rider_changes" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "from_rider_name" TEXT,
    "to_rider_name" TEXT NOT NULL,
    "order_status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_rider_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_rider_changes_order_id_idx" ON "order_rider_changes"("order_id");

-- AddForeignKey
ALTER TABLE "order_rider_changes" ADD CONSTRAINT "order_rider_changes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
