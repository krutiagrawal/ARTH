/*
  Warnings:

  - The `planting_space` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "planting_space",
ADD COLUMN     "planting_space" TEXT[] DEFAULT ARRAY[]::TEXT[];
