-- DropForeignKey
ALTER TABLE "subscription" DROP CONSTRAINT IF EXISTS "subscription_location_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "idx_subscription_location";

-- DropIndex
DROP INDEX IF EXISTS "unique_user_location";

-- AlterTable
ALTER TABLE "subscription"
ADD COLUMN "search_type" VARCHAR(50) NOT NULL,
ADD COLUMN "search_value" TEXT NOT NULL,
DROP COLUMN IF EXISTS "location_id";

-- CreateTable
CREATE TABLE "artefact_search" (
    "id" TEXT NOT NULL,
    "artefact_id" UUID NOT NULL,
    "case_number" TEXT,
    "case_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artefact_search_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "artefact_search_artefact_id_idx" ON "artefact_search"("artefact_id");

-- CreateIndex
CREATE INDEX "idx_subscription_search" ON "subscription"("search_type", "search_value");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_user_id_search_type_search_value_key" ON "subscription"("user_id", "search_type", "search_value");

-- AddForeignKey
ALTER TABLE "artefact_search" ADD CONSTRAINT "artefact_search_artefact_id_fkey" FOREIGN KEY ("artefact_id") REFERENCES "artefact"("artefact_id") ON DELETE CASCADE ON UPDATE CASCADE;
