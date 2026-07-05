-- CreateEnum
CREATE TYPE "EcosystemZone" AS ENUM ('canopy', 'understory', 'forest_floor', 'water', 'meadow');

-- CreateTable
CREATE TABLE "decoration_types" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "zone" "EcosystemZone" NOT NULL,
    "name" TEXT NOT NULL,
    "colorway" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "decoration_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decoration_placements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "decoration_type_id" TEXT NOT NULL,
    "position_x" DOUBLE PRECISION NOT NULL,
    "position_y" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decoration_placements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "decoration_types_key_key" ON "decoration_types"("key");

-- CreateIndex
CREATE INDEX "decoration_placements_user_id_idx" ON "decoration_placements"("user_id");

-- AddForeignKey
ALTER TABLE "decoration_placements" ADD CONSTRAINT "decoration_placements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decoration_placements" ADD CONSTRAINT "decoration_placements_decoration_type_id_fkey" FOREIGN KEY ("decoration_type_id") REFERENCES "decoration_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
