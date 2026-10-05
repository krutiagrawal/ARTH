-- Run only after prisma/scripts/backfillPublicIds.ts has confirmed zero remaining NULLs.

-- AlterTable
ALTER TABLE "trees" ALTER COLUMN "public_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "planted_trees" ALTER COLUMN "public_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "trees_public_id_key" ON "trees"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "planted_trees_public_id_key" ON "planted_trees"("public_id");
