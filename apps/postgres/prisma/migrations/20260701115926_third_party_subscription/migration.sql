-- DropForeignKey
ALTER TABLE "third_party_subscription" DROP CONSTRAINT "third_party_subscription_list_type_id_fkey";

-- AlterTable
ALTER TABLE "third_party_subscription" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "third_party_user" ALTER COLUMN "id" DROP DEFAULT;
