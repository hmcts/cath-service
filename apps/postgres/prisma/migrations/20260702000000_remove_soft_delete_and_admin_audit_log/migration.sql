-- Remove soft-delete columns from jurisdiction, region, sub_jurisdiction
-- Hard deletes are now used; audit entries go to the existing audit_log table

ALTER TABLE "jurisdiction" DROP COLUMN IF EXISTS "deleted_at";
ALTER TABLE "region" DROP COLUMN IF EXISTS "deleted_at";
ALTER TABLE "sub_jurisdiction" DROP COLUMN IF EXISTS "deleted_at";

-- Drop admin_audit_log table and its indexes (superseded by audit_log)
DROP INDEX IF EXISTS "admin_audit_log_performed_at_idx";
DROP INDEX IF EXISTS "admin_audit_log_entity_type_idx";
DROP TABLE IF EXISTS "admin_audit_log";
