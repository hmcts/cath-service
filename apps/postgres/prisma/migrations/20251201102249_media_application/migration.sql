/*
  Warnings:

  - You are about to drop the column `full_name` on the `media_application` table. All the data in the column will be lost.
  - You are about to drop the column `request_date` on the `media_application` table. All the data in the column will be lost.
  - You are about to drop the column `status_date` on the `media_application` table. All the data in the column will be lost.
  - You are about to alter the column `email` on the `media_application` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `employer` on the `media_application` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `status` on the `media_application` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - Added the required column `name` to the `media_application` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "media_application" DROP COLUMN "full_name",
DROP COLUMN "request_date",
DROP COLUMN "status_date",
ADD COLUMN     "applied_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "name" VARCHAR(255) NOT NULL,
ADD COLUMN     "proof_of_id_path" VARCHAR(500),
ADD COLUMN     "reviewed_by" VARCHAR(255),
ADD COLUMN     "reviewed_date" TIMESTAMP(3),
ALTER COLUMN "email" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "employer" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "status" SET DATA TYPE VARCHAR(20);
