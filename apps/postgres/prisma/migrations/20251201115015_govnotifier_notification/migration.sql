-- DropForeignKey (only if exists)
ALTER TABLE "ingestion_log" DROP CONSTRAINT IF EXISTS "fk_blob_artefact";

-- AlterTable
ALTER TABLE "ingestion_log" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "notification_log" (
    "notification_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "publication_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "notification_log_pkey" PRIMARY KEY ("notification_id")
);

-- CreateIndex
CREATE INDEX "notification_log_user_id_idx" ON "notification_log"("user_id");

-- CreateIndex
CREATE INDEX "notification_log_publication_id_idx" ON "notification_log"("publication_id");

-- CreateIndex
CREATE INDEX "notification_log_subscription_id_idx" ON "notification_log"("subscription_id");

-- CreateIndex
CREATE INDEX "notification_log_created_at_idx" ON "notification_log"("created_at");

-- AddForeignKey
ALTER TABLE "ingestion_log" ADD CONSTRAINT "ingestion_log_artefact_id_fkey" FOREIGN KEY ("artefact_id") REFERENCES "artefact"("artefact_id") ON DELETE SET NULL ON UPDATE CASCADE;
