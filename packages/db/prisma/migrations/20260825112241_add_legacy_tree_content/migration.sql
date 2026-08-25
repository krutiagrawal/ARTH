-- CreateTable
CREATE TABLE "legacy_trees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "years" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "quote" TEXT NOT NULL,

    CONSTRAINT "legacy_trees_pkey" PRIMARY KEY ("id")
);
