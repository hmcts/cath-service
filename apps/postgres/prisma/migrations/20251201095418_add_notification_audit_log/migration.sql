-- DropForeignKey
ALTER TABLE "ingestion_log" DROP CONSTRAINT "fk_blob_artefact";

-- AlterTable
ALTER TABLE "ingestion_log" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "notification_audit_log" (
    "notification_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "publication_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "notification_audit_log_pkey" PRIMARY KEY ("notification_id")
);

-- CreateIndex
CREATE INDEX "notification_audit_log_publication_id_idx" ON "notification_audit_log"("publication_id");

-- CreateIndex
CREATE INDEX "notification_audit_log_status_idx" ON "notification_audit_log"("status");

-- CreateIndex
CREATE UNIQUE INDEX "notification_audit_log_user_id_publication_id_key" ON "notification_audit_log"("user_id", "publication_id");

-- AddForeignKey
ALTER TABLE "ingestion_log" ADD CONSTRAINT "ingestion_log_artefact_id_fkey" FOREIGN KEY ("artefact_id") REFERENCES "artefact"("artefact_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_audit_log" ADD CONSTRAINT "notification_audit_log_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscription"("subscription_id") ON DELETE RESTRICT ON UPDATE CASCADE;
