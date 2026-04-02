-- AlterTable
ALTER TABLE "notification_audit_log" ADD COLUMN     "email_type" TEXT NOT NULL DEFAULT 'SUBSCRIPTION';

-- CreateIndex
CREATE INDEX "notification_audit_log_user_id_email_type_status_created_at_idx" ON "notification_audit_log"("user_id", "email_type", "status", "created_at");
