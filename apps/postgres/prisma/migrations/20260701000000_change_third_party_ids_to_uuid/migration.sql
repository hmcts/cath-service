-- Change third_party_user and third_party_subscription IDs from TEXT (CUID) to UUID
-- Existing rows are cleared as they have non-UUID IDs that cannot be migrated
TRUNCATE TABLE "third_party_subscription", "third_party_user" CASCADE;

ALTER TABLE "third_party_subscription" DROP CONSTRAINT IF EXISTS "third_party_subscription_third_party_user_id_fkey";
ALTER TABLE "third_party_subscription" DROP CONSTRAINT IF EXISTS "third_party_subscription_list_type_id_fkey";

ALTER TABLE "third_party_user"
  ALTER COLUMN "id" DROP DEFAULT,
  ALTER COLUMN "id" SET DATA TYPE UUID USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "third_party_subscription"
  ALTER COLUMN "id" DROP DEFAULT,
  ALTER COLUMN "id" SET DATA TYPE UUID USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "third_party_user_id" SET DATA TYPE UUID USING gen_random_uuid();

ALTER TABLE "third_party_subscription" ADD CONSTRAINT "third_party_subscription_third_party_user_id_fkey"
  FOREIGN KEY ("third_party_user_id") REFERENCES "third_party_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "third_party_subscription" ADD CONSTRAINT "third_party_subscription_list_type_id_fkey"
  FOREIGN KEY ("list_type_id") REFERENCES "list_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
