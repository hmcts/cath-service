-- AlterTable
ALTER TABLE "jurisdiction" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "region" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "sub_jurisdiction" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "admin_audit_log" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_name" TEXT NOT NULL,
    "performed_by" TEXT NOT NULL,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" TEXT,

    CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "admin_audit_log_performed_at_idx" ON "admin_audit_log"("performed_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "admin_audit_log_entity_type_idx" ON "admin_audit_log"("entity_type");
