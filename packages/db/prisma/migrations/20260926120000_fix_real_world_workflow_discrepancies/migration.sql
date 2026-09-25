-- AlterEnum
ALTER TYPE "BulkRequirementResponseStatus" ADD VALUE 'handed_off';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'bulk_requirement_response_fulfilled';

-- AlterEnum
ALTER TYPE "GroupStatus" ADD VALUE 'pending';

-- AlterTable
ALTER TABLE "bulk_requirement_responses" ADD COLUMN     "handoff_code" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "password_plain";
