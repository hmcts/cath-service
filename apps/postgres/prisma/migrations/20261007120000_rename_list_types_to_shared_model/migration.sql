-- Rename 19 list types to the names used by the shared model (pip-frontend listLookup.json /
-- pip-data-models ListType.java), so the same list has the same name in both systems (#1077).
--
-- Renamed in place rather than reseeded: list_types.id is referenced by artefact.list_type_id,
-- list_types_sub_jurisdictions, subscription_list_type.list_type_ids (Int[], no FK), third-party
-- and search config. Inserting new rows would orphan all of them, so the id must be preserved.
--
-- Runs before the generated seed SQL (apps/postgres/start.sh does migrate deploy first), so the
-- seed's ON CONFLICT (name) matches these rows and soft-delete reconciliation finds nothing stale.
--
-- If both the old and new name already exist (e.g. a database seeded with the new data before
-- migrating), fail loudly instead of skipping: a silent skip would let the seed soft-delete the
-- old row, hiding its artefacts and stopping its subscriptions. Remediation is manual.

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST', 'BRISTOL_AND_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST'),
    ('CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST', 'CST_WEEKLY_HEARING_LIST'),
    ('FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST', 'FTT_LR_WEEKLY_HEARING_LIST'),
    ('FTT_RPT_EASTERN_WEEKLY_HEARING_LIST', 'RPT_EASTERN_WEEKLY_HEARING_LIST'),
    ('FTT_RPT_LONDON_WEEKLY_HEARING_LIST', 'RPT_LONDON_WEEKLY_HEARING_LIST'),
    ('FTT_RPT_MIDLANDS_WEEKLY_HEARING_LIST', 'RPT_MIDLANDS_WEEKLY_HEARING_LIST'),
    ('FTT_RPT_NORTHERN_WEEKLY_HEARING_LIST', 'RPT_NORTHERN_WEEKLY_HEARING_LIST'),
    ('FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST', 'RPT_SOUTHERN_WEEKLY_HEARING_LIST'),
    ('FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST', 'FTT_TAX_WEEKLY_HEARING_LIST'),
    ('MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST', 'MAYOR_AND_CITY_CIVIL_DAILY_CAUSE_LIST'),
    ('UTIAC_JR_BIRMINGHAM_DAILY_HEARING_LIST', 'UT_IAC_JR_BIRMINGHAM_DAILY_HEARING_LIST'),
    ('UTIAC_JR_CARDIFF_DAILY_HEARING_LIST', 'UT_IAC_JR_CARDIFF_DAILY_HEARING_LIST'),
    ('UTIAC_JR_LEEDS_DAILY_HEARING_LIST', 'UT_IAC_JR_LEEDS_DAILY_HEARING_LIST'),
    ('UTIAC_JR_LONDON_DAILY_HEARING_LIST', 'UT_IAC_JR_LONDON_DAILY_HEARING_LIST'),
    ('UTIAC_JR_MANCHESTER_DAILY_HEARING_LIST', 'UT_IAC_JR_MANCHESTER_DAILY_HEARING_LIST'),
    ('UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST', 'UT_IAC_STATUTORY_APPEALS_DAILY_HEARING_LIST'),
    ('UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST', 'UT_AAC_DAILY_HEARING_LIST'),
    ('UT_LANDS_CHAMBER_DAILY_HEARING_LIST', 'UT_LC_DAILY_HEARING_LIST'),
    ('UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST', 'UT_T_AND_CC_DAILY_HEARING_LIST')
  ) AS t(old_name, new_name) LOOP
    IF EXISTS (SELECT 1 FROM "list_types" WHERE "name" = r.old_name)
       AND EXISTS (SELECT 1 FROM "list_types" WHERE "name" = r.new_name) THEN
      RAISE EXCEPTION 'list type rename conflict: both % and % exist', r.old_name, r.new_name;
    END IF;
  END LOOP;
END $$;

UPDATE "list_types" SET "name" = 'BRISTOL_AND_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST', "updated_at" = NOW() WHERE "name" = 'BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST';
UPDATE "list_types" SET "name" = 'CST_WEEKLY_HEARING_LIST', "updated_at" = NOW() WHERE "name" = 'CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST';
UPDATE "list_types" SET "name" = 'FTT_LR_WEEKLY_HEARING_LIST', "updated_at" = NOW() WHERE "name" = 'FTT_LANDS_REGISTRATION_TRIBUNAL_WEEKLY_HEARING_LIST';
UPDATE "list_types" SET "name" = 'RPT_EASTERN_WEEKLY_HEARING_LIST', "updated_at" = NOW() WHERE "name" = 'FTT_RPT_EASTERN_WEEKLY_HEARING_LIST';
UPDATE "list_types" SET "name" = 'RPT_LONDON_WEEKLY_HEARING_LIST', "updated_at" = NOW() WHERE "name" = 'FTT_RPT_LONDON_WEEKLY_HEARING_LIST';
UPDATE "list_types" SET "name" = 'RPT_MIDLANDS_WEEKLY_HEARING_LIST', "updated_at" = NOW() WHERE "name" = 'FTT_RPT_MIDLANDS_WEEKLY_HEARING_LIST';
UPDATE "list_types" SET "name" = 'RPT_NORTHERN_WEEKLY_HEARING_LIST', "updated_at" = NOW() WHERE "name" = 'FTT_RPT_NORTHERN_WEEKLY_HEARING_LIST';
UPDATE "list_types" SET "name" = 'RPT_SOUTHERN_WEEKLY_HEARING_LIST', "updated_at" = NOW() WHERE "name" = 'FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST';
UPDATE "list_types" SET "name" = 'FTT_TAX_WEEKLY_HEARING_LIST', "updated_at" = NOW() WHERE "name" = 'FTT_TAX_CHAMBER_WEEKLY_HEARING_LIST';
UPDATE "list_types" SET "name" = 'MAYOR_AND_CITY_CIVIL_DAILY_CAUSE_LIST', "updated_at" = NOW() WHERE "name" = 'MAYOR_CITY_CIVIL_DAILY_CAUSE_LIST';
UPDATE "list_types" SET "name" = 'UT_IAC_JR_BIRMINGHAM_DAILY_HEARING_LIST', "updated_at" = NOW() WHERE "name" = 'UTIAC_JR_BIRMINGHAM_DAILY_HEARING_LIST';
UPDATE "list_types" SET "name" = 'UT_IAC_JR_CARDIFF_DAILY_HEARING_LIST', "updated_at" = NOW() WHERE "name" = 'UTIAC_JR_CARDIFF_DAILY_HEARING_LIST';
UPDATE "list_types" SET "name" = 'UT_IAC_JR_LEEDS_DAILY_HEARING_LIST', "updated_at" = NOW() WHERE "name" = 'UTIAC_JR_LEEDS_DAILY_HEARING_LIST';
UPDATE "list_types" SET "name" = 'UT_IAC_JR_LONDON_DAILY_HEARING_LIST', "updated_at" = NOW() WHERE "name" = 'UTIAC_JR_LONDON_DAILY_HEARING_LIST';
UPDATE "list_types" SET "name" = 'UT_IAC_JR_MANCHESTER_DAILY_HEARING_LIST', "updated_at" = NOW() WHERE "name" = 'UTIAC_JR_MANCHESTER_DAILY_HEARING_LIST';
UPDATE "list_types" SET "name" = 'UT_IAC_STATUTORY_APPEALS_DAILY_HEARING_LIST', "updated_at" = NOW() WHERE "name" = 'UTIAC_STATUTORY_APPEAL_DAILY_HEARING_LIST';
UPDATE "list_types" SET "name" = 'UT_AAC_DAILY_HEARING_LIST', "updated_at" = NOW() WHERE "name" = 'UT_ADMINISTRATIVE_APPEALS_CHAMBER_DAILY_HEARING_LIST';
UPDATE "list_types" SET "name" = 'UT_LC_DAILY_HEARING_LIST', "updated_at" = NOW() WHERE "name" = 'UT_LANDS_CHAMBER_DAILY_HEARING_LIST';
UPDATE "list_types" SET "name" = 'UT_T_AND_CC_DAILY_HEARING_LIST', "updated_at" = NOW() WHERE "name" = 'UT_TAX_AND_CHANCERY_CHAMBER_DAILY_HEARING_LIST';
