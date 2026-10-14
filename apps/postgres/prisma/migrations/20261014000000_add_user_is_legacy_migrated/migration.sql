-- AlterTable
ALTER TABLE "user" ADD COLUMN "is_legacy_migrated" BOOLEAN NOT NULL DEFAULT false;
