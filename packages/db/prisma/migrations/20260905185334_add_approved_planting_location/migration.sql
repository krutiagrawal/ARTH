-- CreateTable
CREATE TABLE "approved_planting_locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "radius_meters" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approved_planting_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "approved_planting_locations_lat_lng_idx" ON "approved_planting_locations"("lat", "lng");
