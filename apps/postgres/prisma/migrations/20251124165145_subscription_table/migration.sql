/*
  Warnings:

  - You are about to drop the column `is_active` on the `subscription` table. All the data in the column will be lost.
  - You are about to drop the column `subscribed_at` on the `subscription` table. All the data in the column will be lost.
  - You are about to drop the column `unsubscribed_at` on the `subscription` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "idx_subscription_active";

-- AlterTable
ALTER TABLE "subscription" DROP COLUMN "is_active",
DROP COLUMN "subscribed_at",
DROP COLUMN "unsubscribed_at",
ADD COLUMN     "date_added" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
