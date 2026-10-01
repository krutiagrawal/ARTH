-- AlterTable
ALTER TABLE "users" ADD COLUMN     "city" TEXT,
ADD COLUMN     "date_of_birth" TIMESTAMP(3),
ADD COLUMN     "gardening_experience" TEXT,
ADD COLUMN     "home_sunlight" "SunlightNeeds",
ADD COLUMN     "motivation" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "personalization_completed_at" TIMESTAMP(3),
ADD COLUMN     "planting_goal" INTEGER,
ADD COLUMN     "planting_space" TEXT,
ADD COLUMN     "species_interest" TEXT[] DEFAULT ARRAY[]::TEXT[];
