-- Add gov_notify_id column to notification_audit_log (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_audit_log'
    AND column_name = 'gov_notify_id'
  ) THEN
    ALTER TABLE "notification_audit_log"
    ADD COLUMN "gov_notify_id" TEXT;
  END IF;
END $$;

-- Create index for gov_notify_id lookups (idempotent)
CREATE INDEX IF NOT EXISTS "notification_audit_log_gov_notify_id_idx"
ON "notification_audit_log"("gov_notify_id");
