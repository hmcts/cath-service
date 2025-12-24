/*
  Warnings:

  - You are about to drop the column `reviewed_by` on the `media_application` table. All the data in the column will be lost.
  - You are about to drop the column `reviewed_date` on the `media_application` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "media_application" DROP COLUMN "reviewed_by",
DROP COLUMN "reviewed_date";
