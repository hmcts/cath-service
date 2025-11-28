/*
  Warnings:

  - Changed the type of `location_id` on the `subscription` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- Drop existing indexes and constraints
DROP INDEX IF EXISTS "idx_subscription_location";
DROP INDEX IF EXISTS "subscription_user_id_location_id_key";

-- AlterTable - Cast location_id from TEXT to INTEGER
ALTER TABLE "subscription"
  ALTER COLUMN "location_id" TYPE INTEGER USING "location_id"::INTEGER;

-- Recreate indexes
CREATE INDEX "idx_subscription_location" ON "subscription"("location_id");
CREATE UNIQUE INDEX "subscription_user_id_location_id_key" ON "subscription"("user_id", "location_id");

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "location"("location_id") ON DELETE RESTRICT ON UPDATE CASCADE;
