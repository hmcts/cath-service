-- Rename 19 list types to the names used by the shared model (pip-frontend listLookup.json /
-- pip-data-models ListType enum), so both systems agree on list type names.
--
-- Renamed in place rather than reseeded: list_types.id is an autoincrement primary key referenced
-- by artefact, list_types_sub_jurisdictions, subscription_list_type, third_party_subscription,
-- legacy_third_party_subscription, legacy_third_party_push_log and list_search_config. Inserting
-- new rows and letting the deploy seed soft-delete the old ones would orphan all of those, so the
-- id must be preserved.
--
-- Runs before the generated seed SQL (apps/postgres/start.sh does migrate deploy first), so the
-- seed's ON CONFLICT (name) then matches these rows, updates the friendly names, and the
-- soft-delete reconciliation finds nothing stale.
--
-- Guarded on the new name not already existing, because name is UNIQUE.

UPDATE "list_types" SET "name" = 'BRISTOL_AND_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST', "updated_at" = NOW()
WHERE "name" = 'BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST'
  AND NOT EXISTS (SELECT 1 FROM "list_types" WHERE "name" = 'BRISTOL_AND_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST');

UPDATE "list_types" SET "name" = 'CST_WEEKLY_HEARING_LIST', "updated_at" = NOW()
WHERE "name" = 'CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST'
  AND NOT EXISTS (SELECT 1 FROM "list_types" WHERE "name" = 'CST_WEEKLY_HEARING_LIST');

UPDATE "list_types" SET "name" = 'FTT_LR_WEEKLY_HEARING_LIST', "updated_at" = NOW()
WHERE "name" = 'FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST'
  AND NOT EXISTS (SELECT 1 FROM "list_types" WHERE "name" = 'FTT_LR_WEEKLY_HEARING_LIST');

UPDATE "list_types" SET "name" = 'RPT_EASTERN_WEEKLY_HEARING_LIST', "updated_at" = NOW()
WHERE "name" = 'FTT_RPT_EASTERN_WEEKLY_HEARING_LIST'
  AND NOT EXISTS (SELECT 1 FROM "list_types" WHERE "name" = 'RPT_EASTERN_WEEKLY_HEARING_LIST');

UPDATE "list_types" SET "name" = 'RPT_LONDON_WEEKLY_HEARING_LIST', "updated_at" = NOW()
WHERE "name" = 'FTT_RPT_LONDON_WEEKLY_HEARING_LIST'
  AND NOT EXISTS (SELECT 1 FROM "list_types" WHERE "name" = 'RPT_LONDON_WEEKLY_HEARING_LIST');

UPDATE "list_types" SET "name" = 'RPT_MIDLANDS_WEEKLY_HEARING_LIST', "updated_at" = NOW()
WHERE "name" = 'FTT_RPT_MIDLANDS_WEEKLY_HEARING_LIST'
  AND NOT EXISTS (SELECT 1 FROM "list_types" WHERE "name" = 'RPT_MIDLANDS_WEEKLY_HEARING_LIST');

UPDATE "list_types" SET "name" = 'RPT_NORTHERN_WEEKLY_HEARING_LIST', "updated_at" = NOW()
WHERE "name" = 'FTT_RPT_NORTHERN_WEEKLY_HEARING_LIST'
  AND NOT EXISTS (SELECT 1 FROM "list_types" WHERE "name" = 'RPT_NORTHERN_WEEKLY_HEARING_LIST');

UPDATE "list_types" SET "name" = 'RPT_SOUTHERN_WEEKLY_HEARING_LIST', "updated_at" = NOW()
WHERE "name" = 'FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST'
  AND NOT EXISTS (SELECT 1 FROM "list_types" WHERE "name" = 'RPT_SOUTHERN_WEEKLY_HEARING_LIST');

UPDATE "list_types" SET "name" = 'FTT_TAX_WEEKLY_HEARING_LIST', "updated_at" = NOW()
WHERE "name" = 'FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST'
  AND NOT EXISTS (SELECT 1 FROM "list_types" WHERE "name" = 'FTT_TAX_WEEKLY_HEARING_LIST');

UPDATE "list_types" SET "name" = 'MAYOR_AND_CITY_CIVIL_DAILY_CAUSE_LIST', "updated_at" = NOW()
WHERE "name" = 'MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST'
  AND NOT EXISTS (SELECT 1 FROM "list_types" WHERE "name" = 'MAYOR_AND_CITY_CIVIL_DAILY_CAUSE_LIST');

UPDATE "list_types" SET "name" = 'UT_IAC_JR_BIRMINGHAM_DAILY_HEARING_LIST', "updated_at" = NOW()
WHERE "name" = 'UTIAC_JR_BIRMINGHAM_DAILY_HEARING_LIST'
  AND NOT EXISTS (SELECT 1 FROM "list_types" WHERE "name" = 'UT_IAC_JR_BIRMINGHAM_DAILY_HEARING_LIST');

UPDATE "list_types" SET "name" = 'UT_IAC_JR_CARDIFF_DAILY_HEARING_LIST', "updated_at" = NOW()
WHERE "name" = 'UTIAC_JR_CARDIFF_DAILY_HEARING_LIST'
  AND NOT EXISTS (SELECT 1 FROM "list_types" WHERE "name" = 'UT_IAC_JR_CARDIFF_DAILY_HEARING_LIST');

UPDATE "list_types" SET "name" = 'UT_IAC_JR_LEEDS_DAILY_HEARING_LIST', "updated_at" = NOW()
WHERE "name" = 'UTIAC_JR_LEEDS_DAILY_HEARING_LIST'
  AND NOT EXISTS (SELECT 1 FROM "list_types" WHERE "name" = 'UT_IAC_JR_LEEDS_DAILY_HEARING_LIST');

UPDATE "list_types" SET "name" = 'UT_IAC_JR_LONDON_DAILY_HEARING_LIST', "updated_at" = NOW()
WHERE "name" = 'UTIAC_JR_LONDON_DAILY_HEARING_LIST'
  AND NOT EXISTS (SELECT 1 FROM "list_types" WHERE "name" = 'UT_IAC_JR_LONDON_DAILY_HEARING_LIST');

UPDATE "list_types" SET "name" = 'UT_IAC_JR_MANCHESTER_DAILY_HEARING_LIST', "updated_at" = NOW()
WHERE "name" = 'UTIAC_JR_MANCHESTER_DAILY_HEARING_LIST'
  AND NOT EXISTS (SELECT 1 FROM "list_types" WHERE "name" = 'UT_IAC_JR_MANCHESTER_DAILY_HEARING_LIST');

UPDATE "list_types" SET "name" = 'UT_IAC_STATUTORY_APPEALS_DAILY_HEARING_LIST', "updated_at" = NOW()
WHERE "name" = 'UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST'
  AND NOT EXISTS (SELECT 1 FROM "list_types" WHERE "name" = 'UT_IAC_STATUTORY_APPEALS_DAILY_HEARING_LIST');

UPDATE "list_types" SET "name" = 'UT_AAC_DAILY_HEARING_LIST', "updated_at" = NOW()
WHERE "name" = 'UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST'
  AND NOT EXISTS (SELECT 1 FROM "list_types" WHERE "name" = 'UT_AAC_DAILY_HEARING_LIST');

UPDATE "list_types" SET "name" = 'UT_LC_DAILY_HEARING_LIST', "updated_at" = NOW()
WHERE "name" = 'UT_LANDS_CHAMBER_DAILY_HEARING_LIST'
  AND NOT EXISTS (SELECT 1 FROM "list_types" WHERE "name" = 'UT_LC_DAILY_HEARING_LIST');

UPDATE "list_types" SET "name" = 'UT_T_AND_CC_DAILY_HEARING_LIST', "updated_at" = NOW()
WHERE "name" = 'UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST'
  AND NOT EXISTS (SELECT 1 FROM "list_types" WHERE "name" = 'UT_T_AND_CC_DAILY_HEARING_LIST');
