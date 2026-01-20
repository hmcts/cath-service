-- DropForeignKey
ALTER TABLE "subscription" DROP CONSTRAINT IF EXISTS "subscription_location_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "idx_subscription_location";

-- DropIndex
DROP INDEX IF EXISTS "unique_user_location";

-- AlterTable
ALTER TABLE "subscription" DROP COLUMN IF EXISTS "location_id";

-- AlterTable
ALTER TABLE "subscription" ALTER COLUMN "search_type" SET NOT NULL;

-- AlterTable
ALTER TABLE "subscription" ALTER COLUMN "search_value" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "unique_user_subscription" ON "subscription"("user_id", "search_type", "search_value");
