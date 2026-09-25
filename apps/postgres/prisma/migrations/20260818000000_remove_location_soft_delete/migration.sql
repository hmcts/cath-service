-- Remove soft-delete column from location; hard deletes are now used for courts.
ALTER TABLE "location" DROP COLUMN IF EXISTS "deleted_at";
