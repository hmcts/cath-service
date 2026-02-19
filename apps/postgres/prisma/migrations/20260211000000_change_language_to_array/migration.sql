-- Drop the old unique constraint that includes language
DROP INDEX IF EXISTS "subscription_list_type_user_id_list_type_id_language_key";

-- Consolidate duplicate rows by merging languages into arrays
-- Create a temporary table with merged data
CREATE TEMP TABLE merged_subscriptions AS
SELECT
  (ARRAY_AGG(list_type_subscription_id ORDER BY date_added))[1] as list_type_subscription_id,
  user_id,
  list_type_id,
  ARRAY_AGG(DISTINCT language ORDER BY language) as languages,
  MIN(date_added) as date_added
FROM subscription_list_type
GROUP BY user_id, list_type_id;

-- Delete all existing rows
DELETE FROM subscription_list_type;

-- Insert merged data back
INSERT INTO subscription_list_type (list_type_subscription_id, user_id, list_type_id, language, date_added)
SELECT list_type_subscription_id, user_id, list_type_id, languages[1], date_added
FROM merged_subscriptions;

-- Change language column to array
ALTER TABLE "subscription_list_type" ALTER COLUMN "language" TYPE TEXT[] USING ARRAY[language]::TEXT[];

-- Update with full language arrays
UPDATE subscription_list_type s
SET language = m.languages
FROM merged_subscriptions m
WHERE s.list_type_subscription_id = m.list_type_subscription_id;

-- Create new unique constraint without language (since one row can now have multiple languages)
CREATE UNIQUE INDEX "subscription_list_type_user_id_list_type_id_key" ON "subscription_list_type"("user_id", "list_type_id");
