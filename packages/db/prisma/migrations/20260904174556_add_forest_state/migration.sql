/*
  Warnings:

  - Added the required column `state` to the `forests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- Existing rows get a placeholder default; apps/web/prisma/seed.js re-seeds the
-- forests table wholesale on every run (deleteMany + createMany), overwriting
-- this placeholder with the real per-forest state value.
ALTER TABLE "forests" ADD COLUMN     "state" TEXT NOT NULL DEFAULT '';
ALTER TABLE "forests" ALTER COLUMN "state" DROP DEFAULT;
