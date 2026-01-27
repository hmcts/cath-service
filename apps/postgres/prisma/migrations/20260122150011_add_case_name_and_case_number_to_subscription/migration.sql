-- AlterTable
ALTER TABLE "subscription" ADD COLUMN     "case_name" TEXT,
ADD COLUMN     "case_number" TEXT;

-- CreateIndex
CREATE INDEX "idx_subscription_case_number" ON "subscription"("case_number");
