/*
  Warnings:

  - You are about to drop the column `channel` on the `legacy_third_party_subscription` table. All the data in the column will be lost.
  - You are about to drop the column `sensitivity` on the `legacy_third_party_subscription` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "legacy_third_party_subscription" DROP COLUMN "channel",
DROP COLUMN "sensitivity";
