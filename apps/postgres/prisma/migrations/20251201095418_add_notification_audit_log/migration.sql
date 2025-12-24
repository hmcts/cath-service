-- DropForeignKey (only if exists)
ALTER TABLE "ingestion_log" DROP CONSTRAINT IF EXISTS "fk_blob_artefact";

-- AlterTable (only if DEFAULT exists)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ingestion_log'
    AND column_name = 'id'
    AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE "ingestion_log" ALTER COLUMN "id" DROP DEFAULT;
  END IF;
END $$;

-- CreateTable (only if not exists)
CREATE TABLE IF NOT EXISTS "notification_audit_log" (
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

-- CreateIndex (only if not exists)
CREATE INDEX IF NOT EXISTS "notification_audit_log_publication_id_idx" ON "notification_audit_log"("publication_id");

-- CreateIndex (only if not exists)
CREATE INDEX IF NOT EXISTS "notification_audit_log_status_idx" ON "notification_audit_log"("status");

-- CreateIndex (only if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS "notification_audit_log_user_id_publication_id_key" ON "notification_audit_log"("user_id", "publication_id");

-- AddForeignKey (only if not exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ingestion_log_artefact_id_fkey'
  ) THEN
    ALTER TABLE "ingestion_log" ADD CONSTRAINT "ingestion_log_artefact_id_fkey" FOREIGN KEY ("artefact_id") REFERENCES "artefact"("artefact_id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey (only if not exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notification_audit_log_subscription_id_fkey'
  ) THEN
    ALTER TABLE "notification_audit_log" ADD CONSTRAINT "notification_audit_log_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscription"("subscription_id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
