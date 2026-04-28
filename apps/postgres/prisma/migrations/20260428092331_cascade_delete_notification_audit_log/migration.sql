-- DropForeignKey
ALTER TABLE "notification_audit_log" DROP CONSTRAINT "notification_audit_log_subscription_id_fkey";

-- AddForeignKey
ALTER TABLE "notification_audit_log" ADD CONSTRAINT "notification_audit_log_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscription"("subscription_id") ON DELETE CASCADE ON UPDATE CASCADE;
