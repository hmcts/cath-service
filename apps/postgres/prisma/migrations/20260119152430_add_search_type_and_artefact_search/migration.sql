-- DropForeignKey
ALTER TABLE "subscription" DROP CONSTRAINT "subscription_location_id_fkey";

-- AlterTable
ALTER TABLE "subscription" ADD COLUMN     "search_type" VARCHAR(50),
ADD COLUMN     "search_value" TEXT,
ALTER COLUMN "location_id" DROP NOT NULL;

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

-- AddForeignKey
ALTER TABLE "artefact_search" ADD CONSTRAINT "artefact_search_artefact_id_fkey" FOREIGN KEY ("artefact_id") REFERENCES "artefact"("artefact_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "location"("location_id") ON DELETE SET NULL ON UPDATE CASCADE;
