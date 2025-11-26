-- AlterTable
ALTER TABLE "artefact" ADD COLUMN     "no_match" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "subscription" (
    "subscription_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "location_id" TEXT NOT NULL,
    "date_added" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("subscription_id")
);

-- CreateTable
CREATE TABLE "ingestion_log" (
    "id" UUID NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_system" TEXT NOT NULL,
    "court_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "artefact_id" UUID,

    CONSTRAINT "ingestion_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_subscription_location" ON "subscription"("location_id");

-- CreateIndex
CREATE INDEX "idx_subscription_user" ON "subscription"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_user_id_location_id_key" ON "subscription"("user_id", "location_id");

-- CreateIndex
CREATE INDEX "ingestion_log_timestamp_idx" ON "ingestion_log"("timestamp");

-- CreateIndex
CREATE INDEX "ingestion_log_status_idx" ON "ingestion_log"("status");

-- CreateIndex
CREATE INDEX "ingestion_log_source_system_idx" ON "ingestion_log"("source_system");

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
