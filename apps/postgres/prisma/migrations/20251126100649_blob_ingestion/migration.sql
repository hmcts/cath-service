-- CreateExtension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- AlterTable
ALTER TABLE "artefact" ADD COLUMN     "no_match" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ingestion_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_system" TEXT NOT NULL,
    "court_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "artefact_id" UUID,

    CONSTRAINT "ingestion_log_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fk_blob_artefact" FOREIGN KEY ("artefact_id") REFERENCES "artefact"("artefact_id") ON DELETE SET NULL
);

-- CreateIndex
CREATE INDEX "ingestion_log_timestamp_idx" ON "ingestion_log"("timestamp");

-- CreateIndex
CREATE INDEX "ingestion_log_status_idx" ON "ingestion_log"("status");

-- CreateIndex
CREATE INDEX "ingestion_log_source_system_idx" ON "ingestion_log"("source_system");
