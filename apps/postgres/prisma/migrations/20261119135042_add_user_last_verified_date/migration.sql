-- AlterTable
ALTER TABLE "user" ADD COLUMN     "last_verified_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill: existing users are treated as last verified at their last sign-in, or creation if they never signed in
UPDATE "user" SET "last_verified_date" = COALESCE("last_signed_in_date", "created_date");
