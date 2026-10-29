-- Copies what cath has added, changed or deleted since pip-to-cath-migration.sql was applied
-- back into pip, so traffic can go back to it. See docs/migration/legacy-data-migration.md.
--
-- export PIP_ACCOUNT_PASSWORD PIP_PUBLICATION_PASSWORD     (logins that can write to pip)
-- psql "$DATABASE_URL" -f cath-to-pip-migration.sql \
--   -v account_host=... -v account_dbname=accountmanagement -v account_user=<login> \
--   -v publication_host=... -v publication_dbname=datamanagement -v publication_user=<login> \
--   -v legacy_storage=<pip storage account> -v cath_storage=<cath storage account> [-v apply=1]
--
-- Without -v apply=1 it is a dry run: it reports, then rolls back on cath and pip. With it, it
-- commits and writes cath-to-pip-files.sh (or -v files_script=<path>), which copies the files of
-- the rows written: run it with bash after `azcopy login`.
--
-- Only rows cath changed are written, and only the columns that changed, so pip values the
-- migration couldn't carry over (super-admin roles, CASE_ID and CASE_URN subscriptions, list
-- types with no cath equivalent) are left as they are. A row that can't be written, such as
-- one whose list type or audit action pip doesn't have, is reported and skipped. Rerunning is
-- safe: a row already written is found and left alone.
--
-- Run it after cath has stopped taking traffic. It reads one snapshot of cath, so anything
-- written after it starts is not copied; rerun it to pick that up. The two pip databases commit
-- one after the other, so if the second commit fails, rerun to finish.

\set ON_ERROR_STOP on

\if :{?account_host} \else \set missing 1 \echo 'pass -v account_host=<value>' \endif
\if :{?account_dbname} \else \set missing 1 \echo 'pass -v account_dbname=<value>' \endif
\if :{?account_user} \else \set missing 1 \echo 'pass -v account_user=<value>' \endif
\if :{?publication_host} \else \set missing 1 \echo 'pass -v publication_host=<value>' \endif
\if :{?publication_dbname} \else \set missing 1 \echo 'pass -v publication_dbname=<value>' \endif
\if :{?publication_user} \else \set missing 1 \echo 'pass -v publication_user=<value>' \endif
\if :{?legacy_storage} \else \set missing 1 \echo 'pass -v legacy_storage=<value>' \endif
\if :{?cath_storage} \else \set missing 1 \echo 'pass -v cath_storage=<value>' \endif
\getenv account_password PIP_ACCOUNT_PASSWORD
\getenv publication_password PIP_PUBLICATION_PASSWORD
\if :{?account_password} \else \set missing 1 \echo 'export PIP_ACCOUNT_PASSWORD' \endif
\if :{?publication_password} \else \set missing 1 \echo 'export PIP_PUBLICATION_PASSWORD' \endif
\if :{?missing}
DO $$ BEGIN RAISE EXCEPTION 'settings missing, listed above'; END $$;
\endif
\if :{?files_script} \else \set files_script cath-to-pip-files.sh \endif
-- Tested as a boolean, so -v apply=0 is a dry run. A value psql can't read as one is reported and
-- treated as false.
\if :{?apply} \else \set apply false \endif

BEGIN ISOLATION LEVEL REPEATABLE READ;

DO $$
BEGIN
  IF to_regnamespace('legacy_migration_baseline') IS NULL THEN
    RAISE EXCEPTION 'legacy_migration_baseline does not exist: pip-to-cath-migration.sql has not been applied, so there is nothing to copy back';
  END IF;
END $$;

-- ---------------------------------------------------------------------------------------------
-- Connect to pip. Created inside the transaction and dropped before it commits, so no pip
-- connection is left behind. The password is still in this statement's text, which
-- pg_stat_statements keeps; rotate the pip logins after the run.
-- ---------------------------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS postgres_fdw;

CREATE SERVER legacy_account FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (host :'account_host', port '5432', dbname :'account_dbname', sslmode 'require');
CREATE USER MAPPING FOR CURRENT_USER SERVER legacy_account
  OPTIONS (user :'account_user', password :'account_password');
CREATE SCHEMA legacy_account;
IMPORT FOREIGN SCHEMA public
  LIMIT TO (pi_user, pi_user_archived, subscription, subscription_list_type, media_application, audit_log,
            api_user, api_subscription, api_oauth_configuration)
  FROM SERVER legacy_account INTO legacy_account;

CREATE SERVER legacy_publication FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (host :'publication_host', port '5432', dbname :'publication_dbname', sslmode 'require');
CREATE USER MAPPING FOR CURRENT_USER SERVER legacy_publication
  OPTIONS (user :'publication_user', password :'publication_password');
CREATE SCHEMA legacy_publication;
IMPORT FOREIGN SCHEMA public
  LIMIT TO (location, location_metadata, list_search_config, artefact, artefact_search)
  FROM SERVER legacy_publication INTO legacy_publication;

-- ---------------------------------------------------------------------------------------------
-- Mappings. pip-to-cath-migration.sql has the same ones; keep them in step.
-- ---------------------------------------------------------------------------------------------

-- Legacy ListType enum names that differ from list_types.name. #1077 renamed most list types
-- here to the legacy names, so only these are left; names in both are matched as they are.
CREATE TEMP TABLE list_type_rename (legacy_name text PRIMARY KEY, name text NOT NULL) ON COMMIT DROP;
INSERT INTO list_type_rename VALUES
  ('INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST', 'INTERIM_APPLICATIONS_DAILY_CAUSE_LIST'),
  -- Legacy V1.25/V1.26 moved the Crown Warned List to the Crown Advance List, and #957 renamed it here.
  ('CROWN_ADVANCE_PDDA_LIST', 'CROWN_ADVANCED_PDDA_LIST'),
  ('CROWN_WARNED_PDDA_LIST', 'CROWN_ADVANCED_PDDA_LIST'),
  -- Unconfirmed: legacy has both CROWN_*_LIST (Common Platform) and CROWN_*_PDDA_LIST.
  ('CROWN_DAILY_LIST', 'CROWN_DAILY_PDDA_LIST'),
  ('CROWN_FIRM_LIST', 'CROWN_FIRM_PDDA_LIST'),
  ('CROWN_WARNED_LIST', 'CROWN_ADVANCED_PDDA_LIST');

-- list_types.id differs per environment, so ids are always resolved by name.
-- The legacy name itself wins over the rename table, so a later rename here to the legacy name
-- needs no change to this script.
CREATE FUNCTION pg_temp.list_type_id(legacy_name text) RETURNS integer LANGUAGE sql STABLE AS $$
  SELECT coalesce(
           (SELECT id FROM public.list_types WHERE deleted_at IS NULL AND name = $1),
           (SELECT id FROM public.list_types
             WHERE deleted_at IS NULL AND name = (SELECT name FROM pg_temp.list_type_rename WHERE legacy_name = $1)))
$$;

-- Cath stores UTC. Legacy data management runs in Europe/London and stores artefact times as
-- London wall-clock time; legacy account management stores UTC.
CREATE FUNCTION pg_temp.london_to_utc(london timestamp) RETURNS timestamp LANGUAGE sql IMMUTABLE AS $$
  SELECT (london AT TIME ZONE 'Europe/London') AT TIME ZONE 'UTC'
$$;
CREATE FUNCTION pg_temp.utc_to_london(utc timestamp) RETURNS timestamp LANGUAGE sql IMMUTABLE AS $$
  SELECT (utc AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/London'
$$;

-- Legacy super-admin roles have no equivalent. SSO re-derives the role on every sign-in.
CREATE TEMP TABLE role_map (legacy_role text PRIMARY KEY, role text NOT NULL) ON COMMIT DROP;
INSERT INTO role_map VALUES
  ('VERIFIED', 'VERIFIED'),
  ('SYSTEM_ADMIN', 'SYSTEM_ADMIN'),
  ('INTERNAL_ADMIN_CTSC', 'INTERNAL_ADMIN_CTSC'),
  ('INTERNAL_ADMIN_LOCAL', 'INTERNAL_ADMIN_LOCAL'),
  ('INTERNAL_SUPER_ADMIN_CTSC', 'INTERNAL_ADMIN_CTSC'),
  ('INTERNAL_SUPER_ADMIN_LOCAL', 'INTERNAL_ADMIN_LOCAL');

CREATE TEMP TABLE search_type_map (legacy_search_type text PRIMARY KEY, search_type text NOT NULL) ON COMMIT DROP;
INSERT INTO search_type_map VALUES
  ('LOCATION_ID', 'LOCATION_ID'),
  ('CASE_NUMBER', 'CASE_NUMBER'),
  ('CASE_NAME', 'CASE_NAME'),
  ('CASE_ID', 'CASE_NUMBER'),
  -- Unconfirmed: only correct if artefact_search.case_number holds URNs for crime lists.
  ('CASE_URN', 'CASE_NUMBER');

-- Legacy fails to load a row holding an enum value it doesn't know, so only these are written.
-- From pip-data-models 2.3.58.
CREATE TEMP TABLE legacy_list_type (name text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO legacy_list_type VALUES
  ('SJP_PUBLIC_LIST'), ('SJP_DELTA_PUBLIC_LIST'), ('SJP_PRESS_LIST'),
  ('SJP_DELTA_PRESS_LIST'), ('SJP_PRESS_REGISTER'), ('CROWN_DAILY_LIST'),
  ('CROWN_FIRM_LIST'), ('CROWN_WARNED_LIST'), ('MAGISTRATES_PUBLIC_LIST'),
  ('MAGISTRATES_STANDARD_LIST'), ('CIVIL_DAILY_CAUSE_LIST'), ('FAMILY_DAILY_CAUSE_LIST'),
  ('CIVIL_AND_FAMILY_DAILY_CAUSE_LIST'), ('COP_DAILY_CAUSE_LIST'), ('ET_FORTNIGHTLY_PRESS_LIST'),
  ('ET_DAILY_LIST'), ('SSCS_DAILY_LIST'), ('SSCS_DAILY_LIST_ADDITIONAL_HEARINGS'),
  ('IAC_DAILY_LIST'), ('IAC_DAILY_LIST_ADDITIONAL_CASES'), ('CARE_STANDARDS_LIST'),
  ('PRIMARY_HEALTH_LIST'), ('CIC_DAILY_HEARING_LIST'), ('CST_WEEKLY_HEARING_LIST'),
  ('PHT_WEEKLY_HEARING_LIST'), ('GRC_WEEKLY_HEARING_LIST'), ('WPAFCC_WEEKLY_HEARING_LIST'),
  ('UT_IAC_JR_LONDON_DAILY_HEARING_LIST'), ('UT_IAC_JR_LEEDS_DAILY_HEARING_LIST'), ('UT_IAC_JR_MANCHESTER_DAILY_HEARING_LIST'),
  ('UT_IAC_JR_BIRMINGHAM_DAILY_HEARING_LIST'), ('UT_IAC_JR_CARDIFF_DAILY_HEARING_LIST'), ('UT_IAC_STATUTORY_APPEALS_DAILY_HEARING_LIST'),
  ('SIAC_WEEKLY_HEARING_LIST'), ('POAC_WEEKLY_HEARING_LIST'), ('PAAC_WEEKLY_HEARING_LIST'),
  ('FTT_TAX_WEEKLY_HEARING_LIST'), ('FTT_LR_WEEKLY_HEARING_LIST'), ('UT_T_AND_CC_DAILY_HEARING_LIST'),
  ('UT_LC_DAILY_HEARING_LIST'), ('UT_AAC_DAILY_HEARING_LIST'), ('RPT_LONDON_WEEKLY_HEARING_LIST'),
  ('RPT_EASTERN_WEEKLY_HEARING_LIST'), ('RPT_MIDLANDS_WEEKLY_HEARING_LIST'), ('RPT_NORTHERN_WEEKLY_HEARING_LIST'),
  ('RPT_SOUTHERN_WEEKLY_HEARING_LIST'), ('FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST'), ('AST_DAILY_HEARING_LIST'),
  ('SSCS_MIDLANDS_DAILY_HEARING_LIST'), ('SSCS_SOUTH_EAST_DAILY_HEARING_LIST'), ('SSCS_WALES_AND_SOUTH_WEST_DAILY_HEARING_LIST'),
  ('SSCS_SCOTLAND_DAILY_HEARING_LIST'), ('SSCS_NORTH_EAST_DAILY_HEARING_LIST'), ('SSCS_NORTH_WEST_DAILY_HEARING_LIST'),
  ('SSCS_LONDON_DAILY_HEARING_LIST'), ('MENTAL_HEALTH_TRIBUNAL_HEARING_LIST'), ('LONDON_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST'),
  ('COUNTY_COURT_LONDON_CIVIL_DAILY_CAUSE_LIST'), ('CIVIL_COURTS_RCJ_DAILY_CAUSE_LIST'), ('COURT_OF_APPEAL_CRIMINAL_DAILY_CAUSE_LIST'),
  ('FAMILY_DIVISION_HIGH_COURT_DAILY_CAUSE_LIST'), ('KINGS_BENCH_DIVISION_DAILY_CAUSE_LIST'), ('KINGS_BENCH_MASTERS_DAILY_CAUSE_LIST'),
  ('SENIOR_COURTS_COSTS_OFFICE_DAILY_CAUSE_LIST'), ('MAYOR_AND_CITY_CIVIL_DAILY_CAUSE_LIST'), ('INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST'),
  ('BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST'), ('INTELLECTUAL_PROPERTY_AND_ENTERPRISE_COURT_DAILY_CAUSE_LIST'), ('INTELLECTUAL_PROPERTY_LIST_CHD_DAILY_CAUSE_LIST'),
  ('LONDON_CIRCUIT_COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST'), ('PATENTS_COURT_CHD_DAILY_CAUSE_LIST'), ('PENSIONS_LIST_CHD_DAILY_CAUSE_LIST'),
  ('PROPERTY_TRUSTS_PROBATE_LIST_CHD_DAILY_CAUSE_LIST'), ('REVENUE_LIST_CHD_DAILY_CAUSE_LIST'), ('TECHNOLOGY_AND_CONSTRUCTION_COURT_KB_DAILY_CAUSE_LIST'),
  ('ADMIRALTY_COURT_KB_DAILY_CAUSE_LIST'), ('BUSINESS_LIST_CHD_DAILY_CAUSE_LIST'), ('CHANCERY_APPEALS_CHD_DAILY_CAUSE_LIST'),
  ('COMMERCIAL_COURT_KB_DAILY_CAUSE_LIST'), ('COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST'), ('COMPETITION_LIST_CHD_DAILY_CAUSE_LIST'),
  ('FINANCIAL_LIST_CHD_KB_DAILY_CAUSE_LIST'), ('INSOLVENCY_AND_COMPANIES_COURT_CHD_DAILY_CAUSE_LIST'), ('COURT_OF_APPEAL_CIVIL_DAILY_CAUSE_LIST'),
  ('BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST'), ('BRISTOL_AND_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST'), ('MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST'),
  ('LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST'), ('PCOL_DAILY_CAUSE_LIST'), ('SEND_DAILY_HEARING_LIST'),
  ('CIC_WEEKLY_HEARING_LIST'), ('MAGISTRATES_ADULT_COURT_LIST_DAILY'), ('MAGISTRATES_ADULT_COURT_LIST_FUTURE'),
  ('MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY'), ('MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE'), ('CROWN_DAILY_PDDA_LIST'),
  ('CROWN_FIRM_PDDA_LIST'), ('CROWN_WARNED_PDDA_LIST'), ('CROWN_ADVANCE_PDDA_LIST'),
  ('HIGH_COURT_CIVIL_DAILY_CAUSE_LIST'), ('HIGH_COURT_FAMILY_DAILY_CAUSE_LIST'), ('BUSINESS_AND_PROPERTY_DAILY_CAUSE_LIST'),
  ('CIRCUIT_COMMERCIAL_COURT_DAILY_CAUSE_LIST'), ('TECHNOLOGY_AND_CONSTRUCTION_COURT_DAILY_CAUSE_LIST');

CREATE TEMP TABLE legacy_audit_action (action text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO legacy_audit_action VALUES
  ('ADMIN_CREATION'), ('APPROVE_MEDIA_APPLICATION'), ('ATTEMPT_SYSTEM_ADMIN_CREATION'),
  ('BULK_MEDIA_UPLOAD'), ('CREATE_LIST_SEARCH_CONFIG'), ('CREATE_LOCATION_METADATA'),
  ('DELETE_LOCATION_ATTEMPT'), ('DELETE_LOCATION_METADATA'), ('DELETE_LOCATION_PUBLICATION_SUCCESS'),
  ('DELETE_LOCATION_SUBSCRIPTION_SUCCESS'), ('DELETE_LOCATION_SUCCESS'), ('DELETE_PUBLICATION'),
  ('DELETE_THIRD_PARTY_SUBSCRIBER'), ('DELETE_THIRD_PARTY_USER'), ('DELETE_USER'),
  ('MANAGE_THIRD_PARTY_SUBSCRIBER_VIEW'), ('MANAGE_THIRD_PARTY_USER_SUBSCRIPTIONS'), ('MANAGE_THIRD_PARTY_USER_VIEW'),
  ('MANAGE_USER'), ('PUBLICATION_UPLOAD'), ('REFERENCE_DATA_DOWNLOAD'),
  ('REFERENCE_DATA_UPLOAD'), ('REJECT_MEDIA_APPLICATION'), ('RESUBMIT_SUBSCRIPTION'),
  ('SYSTEM_ADMIN_CREATION'), ('THIRD_PARTY_SUBSCRIBER_CREATION'), ('THIRD_PARTY_SUBSCRIBER_OAUTH_CONFIG_CREATED'),
  ('THIRD_PARTY_USER_CREATION'), ('UPDATE_LIST_SEARCH_CONFIG'), ('UPDATE_LOCATION_METADATA'),
  ('UPDATE_USER'), ('USER_MANAGEMENT_VIEW'), ('VIEW_BLOB_EXPLORER'),
  ('VIEW_THIRD_PARTY_SUBSCRIBERS'), ('VIEW_THIRD_PARTY_USERS');

-- The cath name if legacy has it, otherwise the legacy name that maps to it. Legacy V1.26
-- removed the Warned lists, so they are never written back.
CREATE FUNCTION pg_temp.legacy_list_type(list_type_id integer) RETURNS text LANGUAGE sql STABLE AS $$
  SELECT coalesce(
           (SELECT l.name FROM pg_temp.legacy_list_type l WHERE l.name = t.name),
           (SELECT min(r.legacy_name) FROM pg_temp.list_type_rename r
             WHERE r.name = t.name AND r.legacy_name NOT IN ('CROWN_WARNED_PDDA_LIST', 'CROWN_WARNED_LIST')))
    FROM public.list_types t
   WHERE t.id = $1
$$;

CREATE FUNCTION pg_temp.legacy_provenance_user_id(user_provenance text, user_provenance_id text) RETURNS text
  LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN $1 = 'CRIME_IDAM' THEN regexp_replace($2, '^CRIME_IDAM:', '') ELSE $2 END
$$;

-- Cath audit ids are cuids; legacy needs a uuid. Derived, so a rerun finds the row it wrote.
CREATE FUNCTION pg_temp.as_uuid(id text) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN $1 ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN $1::uuid ELSE md5($1)::uuid END
$$;

CREATE TEMP TABLE legacy_role (role text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO legacy_role VALUES ('VERIFIED'), ('SYSTEM_ADMIN'), ('INTERNAL_ADMIN_CTSC'), ('INTERNAL_ADMIN_LOCAL'),
  ('INTERNAL_SUPER_ADMIN_CTSC'), ('INTERNAL_SUPER_ADMIN_LOCAL');

-- ---------------------------------------------------------------------------------------------
-- Changes. Each x_* table holds one row per id that differs between cath (c) and the baseline
-- (b): op is insert (only in cath), update (in both, different) or delete (only in the baseline).
-- ---------------------------------------------------------------------------------------------

CREATE TEMP TABLE x_user ON COMMIT DROP AS
SELECT coalesce(c.user_id, b.user_id) AS id, CASE WHEN b.user_id IS NULL THEN 'insert' WHEN c.user_id IS NULL THEN 'delete' ELSE 'update' END AS op, c, b
  FROM public."user" c FULL JOIN legacy_migration_baseline."user" b ON b.user_id = c.user_id
 WHERE to_jsonb(c) IS DISTINCT FROM to_jsonb(b);

CREATE TEMP TABLE x_subscription ON COMMIT DROP AS
SELECT coalesce(c.subscription_id, b.subscription_id) AS id, CASE WHEN b.subscription_id IS NULL THEN 'insert' WHEN c.subscription_id IS NULL THEN 'delete' ELSE 'update' END AS op, c, b
  FROM public.subscription c FULL JOIN legacy_migration_baseline.subscription b ON b.subscription_id = c.subscription_id
 WHERE to_jsonb(c) IS DISTINCT FROM to_jsonb(b);

CREATE TEMP TABLE x_subscription_list_type ON COMMIT DROP AS
SELECT coalesce(c.subscription_list_type_id, b.subscription_list_type_id) AS id, CASE WHEN b.subscription_list_type_id IS NULL THEN 'insert' WHEN c.subscription_list_type_id IS NULL THEN 'delete' ELSE 'update' END AS op, c, b
  FROM public.subscription_list_type c FULL JOIN legacy_migration_baseline.subscription_list_type b ON b.subscription_list_type_id = c.subscription_list_type_id
 WHERE to_jsonb(c) IS DISTINCT FROM to_jsonb(b);

CREATE TEMP TABLE x_legacy_third_party_user ON COMMIT DROP AS
SELECT coalesce(c.id, b.id) AS id, CASE WHEN b.id IS NULL THEN 'insert' WHEN c.id IS NULL THEN 'delete' ELSE 'update' END AS op, c, b
  FROM public.legacy_third_party_user c FULL JOIN legacy_migration_baseline.legacy_third_party_user b ON b.id = c.id
 WHERE to_jsonb(c) IS DISTINCT FROM to_jsonb(b);

CREATE TEMP TABLE x_legacy_third_party_subscription ON COMMIT DROP AS
SELECT coalesce(c.id, b.id) AS id, CASE WHEN b.id IS NULL THEN 'insert' WHEN c.id IS NULL THEN 'delete' ELSE 'update' END AS op, c, b
  FROM public.legacy_third_party_subscription c FULL JOIN legacy_migration_baseline.legacy_third_party_subscription b ON b.id = c.id
 WHERE to_jsonb(c) IS DISTINCT FROM to_jsonb(b);

CREATE TEMP TABLE x_third_party_user ON COMMIT DROP AS
SELECT coalesce(c.id, b.id) AS id, CASE WHEN b.id IS NULL THEN 'insert' WHEN c.id IS NULL THEN 'delete' ELSE 'update' END AS op, c, b
  FROM public.third_party_user c FULL JOIN legacy_migration_baseline.third_party_user b ON b.id = c.id
 WHERE to_jsonb(c) IS DISTINCT FROM to_jsonb(b);

CREATE TEMP TABLE x_third_party_subscription ON COMMIT DROP AS
SELECT coalesce(c.id, b.id) AS id, CASE WHEN b.id IS NULL THEN 'insert' WHEN c.id IS NULL THEN 'delete' ELSE 'update' END AS op, c, b
  FROM public.third_party_subscription c FULL JOIN legacy_migration_baseline.third_party_subscription b ON b.id = c.id
 WHERE to_jsonb(c) IS DISTINCT FROM to_jsonb(b);

CREATE TEMP TABLE x_media_application ON COMMIT DROP AS
SELECT coalesce(c.id, b.id) AS id, CASE WHEN b.id IS NULL THEN 'insert' WHEN c.id IS NULL THEN 'delete' ELSE 'update' END AS op, c, b
  FROM public.media_application c FULL JOIN legacy_migration_baseline.media_application b ON b.id = c.id
 WHERE to_jsonb(c) IS DISTINCT FROM to_jsonb(b);

-- Legacy prunes its own audit log and user archive, so only new rows go back.
CREATE TEMP TABLE x_audit_log ON COMMIT DROP AS
SELECT c.id, 'insert' AS op, c
  FROM public.audit_log c WHERE NOT EXISTS (SELECT 1 FROM legacy_migration_baseline.audit_log b WHERE b.id = c.id);

CREATE TEMP TABLE x_user_archive ON COMMIT DROP AS
SELECT c.user_id AS id, 'insert' AS op, c
  FROM public.user_archive c WHERE NOT EXISTS (SELECT 1 FROM legacy_migration_baseline.user_archive b WHERE b.user_id = c.user_id);

CREATE TEMP TABLE x_location_metadata ON COMMIT DROP AS
SELECT coalesce(c.location_metadata_id, b.location_metadata_id) AS id, CASE WHEN b.location_metadata_id IS NULL THEN 'insert' WHEN c.location_metadata_id IS NULL THEN 'delete' ELSE 'update' END AS op, c, b
  FROM public.location_metadata c FULL JOIN legacy_migration_baseline.location_metadata b ON b.location_metadata_id = c.location_metadata_id
 WHERE to_jsonb(c) - 'updated_at' IS DISTINCT FROM to_jsonb(b) - 'updated_at';

CREATE TEMP TABLE x_list_search_config ON COMMIT DROP AS
SELECT coalesce(c.id, b.id) AS id, CASE WHEN b.id IS NULL THEN 'insert' WHEN c.id IS NULL THEN 'delete' ELSE 'update' END AS op, c, b
  FROM public.list_search_config c FULL JOIN legacy_migration_baseline.list_search_config b ON b.id = c.id
 WHERE to_jsonb(c) - 'updated_at' IS DISTINCT FROM to_jsonb(b) - 'updated_at';

CREATE TEMP TABLE x_artefact ON COMMIT DROP AS
SELECT coalesce(c.artefact_id, b.artefact_id) AS id, CASE WHEN b.artefact_id IS NULL THEN 'insert' WHEN c.artefact_id IS NULL THEN 'delete' ELSE 'update' END AS op, c, b
  FROM public.artefact c FULL JOIN legacy_migration_baseline.artefact b ON b.artefact_id = c.artefact_id
 WHERE to_jsonb(c) IS DISTINCT FROM to_jsonb(b);

-- What was written, and what couldn't be, for the report.
CREATE TEMP TABLE rollback_write (table_name text, op text, rows bigint) ON COMMIT DROP;
CREATE TEMP TABLE rollback_rejection (table_name text, cath_id text, reason text) ON COMMIT DROP;

-- ---------------------------------------------------------------------------------------------
-- Account management: deletes, children first. Legacy foreign keys don't cascade.
-- ---------------------------------------------------------------------------------------------

-- A cath subscription can stand for several legacy rows: CASE_ID and CASE_URN copies collapsed
-- onto one CASE_NUMBER. All of them go, unless cath still has a subscription with that key.
WITH gone AS (
  SELECT (x.b).user_id AS user_id, (x.b).search_type AS search_type, (x.b).search_value AS search_value
    FROM x_subscription x
   WHERE x.op = 'delete'
     AND NOT EXISTS (SELECT 1 FROM public.subscription s
                      WHERE s.user_id = (x.b).user_id AND s.search_type = (x.b).search_type AND s.search_value = (x.b).search_value)
), done AS (
  DELETE FROM legacy_account.subscription l
   USING gone g, search_type_map m
   WHERE l.channel IS DISTINCT FROM 'API_COURTEL'
     AND l.user_id = g.user_id AND l.search_value = g.search_value
     AND m.legacy_search_type = l.search_type AND m.search_type = g.search_type
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'subscription', 'delete', count(*) FROM done;

WITH done AS (
  DELETE FROM legacy_account.subscription_list_type l USING x_subscription_list_type x
   WHERE x.op = 'delete' AND l.id = x.id
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'subscription_list_type', 'delete', count(*) FROM done;

WITH done AS (
  DELETE FROM legacy_account.subscription l USING x_legacy_third_party_subscription x
   WHERE x.op = 'delete' AND l.id = x.id AND l.channel = 'API_COURTEL'
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'legacy_third_party_subscription', 'delete', count(*) FROM done;

-- A deleted account takes everything of its with it, including rows the migration skipped.
DELETE FROM legacy_account.subscription l USING x_user x WHERE x.op = 'delete' AND l.user_id = x.id;
DELETE FROM legacy_account.subscription_list_type l USING x_user x WHERE x.op = 'delete' AND l.user_id = x.id;
DELETE FROM legacy_account.subscription l USING x_legacy_third_party_user x WHERE x.op = 'delete' AND l.user_id = x.id;
WITH done AS (
  DELETE FROM legacy_account.pi_user l
   WHERE l.user_id IN (SELECT id FROM x_user WHERE op = 'delete' UNION ALL SELECT id FROM x_legacy_third_party_user WHERE op = 'delete')
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'user', 'delete', count(*) FROM done;

WITH done AS (
  DELETE FROM legacy_account.api_subscription l USING x_third_party_subscription x
   WHERE x.op = 'delete' AND l.id = x.id
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'third_party_subscription', 'delete', count(*) FROM done;

DELETE FROM legacy_account.api_oauth_configuration l USING x_third_party_user x WHERE x.op = 'delete' AND l.user_id = x.id;
DELETE FROM legacy_account.api_subscription l USING x_third_party_user x WHERE x.op = 'delete' AND l.user_id = x.id;
WITH done AS (
  DELETE FROM legacy_account.api_user l USING x_third_party_user x WHERE x.op = 'delete' AND l.user_id = x.id
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'third_party_user', 'delete', count(*) FROM done;

WITH done AS (
  DELETE FROM legacy_account.media_application l USING x_media_application x WHERE x.op = 'delete' AND l.id = x.id
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'media_application', 'delete', count(*) FROM done;

-- ---------------------------------------------------------------------------------------------
-- Account management: updates. Each column is written only if cath changed it, so legacy
-- values cath couldn't represent survive. A row that isn't in legacy is not touched.
-- ---------------------------------------------------------------------------------------------

WITH done AS (
  UPDATE legacy_account.pi_user l SET
    email = CASE WHEN (x.c).email IS DISTINCT FROM (x.b).email THEN (x.c).email ELSE l.email END,
    forenames = CASE WHEN (x.c).first_name IS DISTINCT FROM (x.b).first_name THEN (x.c).first_name ELSE l.forenames END,
    surname = CASE WHEN (x.c).surname IS DISTINCT FROM (x.b).surname THEN (x.c).surname ELSE l.surname END,
    roles = CASE WHEN (x.c).role IS DISTINCT FROM (x.b).role THEN (x.c).role ELSE l.roles END,
    provenance_user_id = CASE WHEN (x.c).user_provenance_id IS DISTINCT FROM (x.b).user_provenance_id
                              THEN pg_temp.legacy_provenance_user_id((x.c).user_provenance, (x.c).user_provenance_id) ELSE l.provenance_user_id END,
    last_signed_in_date = CASE WHEN (x.c).last_signed_in_date IS DISTINCT FROM (x.b).last_signed_in_date THEN (x.c).last_signed_in_date ELSE l.last_signed_in_date END,
    last_verified_date = CASE WHEN (x.c).last_verified_date IS DISTINCT FROM (x.b).last_verified_date THEN (x.c).last_verified_date ELSE l.last_verified_date END
    FROM x_user x
   WHERE x.op = 'update' AND l.user_id = x.id
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'user', 'update', count(*) FROM done;

WITH done AS (
  UPDATE legacy_account.pi_user l SET provenance_user_id = (x.c).name
    FROM x_legacy_third_party_user x
   WHERE x.op = 'update' AND l.user_id = x.id AND (x.c).name IS DISTINCT FROM (x.b).name
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'legacy_third_party_user', 'update', count(*) FROM done;

WITH done AS (
  UPDATE legacy_account.subscription l SET
    case_name = CASE WHEN (x.c).case_name IS DISTINCT FROM (x.b).case_name THEN (x.c).case_name ELSE l.case_name END,
    case_number = CASE WHEN (x.c).case_number IS DISTINCT FROM (x.b).case_number THEN (x.c).case_number ELSE l.case_number END,
    last_updated_date = now() AT TIME ZONE 'UTC'
    FROM x_subscription x
   WHERE x.op = 'update' AND l.id = x.id
     AND ((x.c).case_name IS DISTINCT FROM (x.b).case_name AND (x.c).case_name IS DISTINCT FROM l.case_name
       OR (x.c).case_number IS DISTINCT FROM (x.b).case_number AND (x.c).case_number IS DISTINCT FROM l.case_number)
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'subscription', 'update', count(*) FROM done;

-- Legacy names that still map to a chosen list type are kept as they are, and so are names cath
-- has no list type for; list types cath added are written under their legacy name.
CREATE FUNCTION pg_temp.merge_list_types(legacy_names text[], list_type_ids integer[]) RETURNS text[] LANGUAGE sql STABLE AS $$
  SELECT ARRAY(
    SELECT n FROM unnest($1) n WHERE pg_temp.list_type_id(n) IS NULL OR pg_temp.list_type_id(n) = ANY($2)
    UNION
    SELECT pg_temp.legacy_list_type(id) FROM unnest($2) id
     WHERE pg_temp.legacy_list_type(id) IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM unnest($1) n WHERE pg_temp.list_type_id(n) = id)
    ORDER BY 1)
$$;

INSERT INTO rollback_rejection
SELECT 'subscription_list_type', x.id::text, format('list type %s has no legacy equivalent', t.name)
  FROM x_subscription_list_type x
 CROSS JOIN LATERAL unnest((x.c).list_type_ids) chosen (list_type_id)
  JOIN public.list_types t ON t.id = chosen.list_type_id
 WHERE x.op IN ('insert', 'update') AND pg_temp.legacy_list_type(chosen.list_type_id) IS NULL;

WITH done AS (
  UPDATE legacy_account.subscription_list_type l SET
    list_type = CASE WHEN (x.c).list_type_ids IS DISTINCT FROM (x.b).list_type_ids
                     THEN pg_temp.merge_list_types(l.list_type, (x.c).list_type_ids) ELSE l.list_type END,
    list_language = CASE WHEN (x.c).list_language IS DISTINCT FROM (x.b).list_language THEN (x.c).list_language ELSE l.list_language END
    FROM x_subscription_list_type x
   WHERE x.op = 'update' AND l.id = x.id
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'subscription_list_type', 'update', count(*) FROM done;

WITH done AS (
  UPDATE legacy_account.api_user l SET name = (x.c).name
    FROM x_third_party_user x
   WHERE x.op = 'update' AND l.user_id = x.id AND (x.c).name IS DISTINCT FROM (x.b).name
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'third_party_user', 'update', count(*) FROM done;

WITH done AS (
  UPDATE legacy_account.api_subscription l SET
    sensitivity = (x.c).sensitivity,
    last_updated_date = now() AT TIME ZONE 'UTC'
    FROM x_third_party_subscription x
   WHERE x.op = 'update' AND l.id = x.id AND (x.c).sensitivity IS DISTINCT FROM (x.b).sensitivity
     AND (x.c).sensitivity IS DISTINCT FROM l.sensitivity
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'third_party_subscription', 'update', count(*) FROM done;

WITH done AS (
  UPDATE legacy_account.media_application l SET
    full_name = CASE WHEN (x.c).name IS DISTINCT FROM (x.b).name THEN (x.c).name ELSE l.full_name END,
    email = CASE WHEN (x.c).email IS DISTINCT FROM (x.b).email THEN (x.c).email ELSE l.email END,
    employer = CASE WHEN (x.c).employer IS DISTINCT FROM (x.b).employer THEN (x.c).employer ELSE l.employer END,
    status = CASE WHEN (x.c).status IS DISTINCT FROM (x.b).status THEN (x.c).status ELSE l.status END,
    status_date = CASE WHEN (x.c).status IS DISTINCT FROM (x.b).status AND (x.c).status IS DISTINCT FROM l.status
                       THEN now() AT TIME ZONE 'UTC' ELSE l.status_date END
    FROM x_media_application x
   WHERE x.op = 'update' AND l.id = x.id
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'media_application', 'update', count(*) FROM done;

-- ---------------------------------------------------------------------------------------------
-- Account management: inserts, parents first. Each r_* table holds the rows in legacy's shape
-- and a reject_reason, checked against legacy as it stands after the steps above.
-- ---------------------------------------------------------------------------------------------

CREATE TEMP TABLE r_user ON COMMIT DROP AS
SELECT x.id AS user_id, (x.c).email, (x.c).first_name AS forenames, (x.c).surname, (x.c).user_provenance,
       pg_temp.legacy_provenance_user_id((x.c).user_provenance, (x.c).user_provenance_id) AS provenance_user_id,
       (x.c).role AS roles, (x.c).created_date, (x.c).last_signed_in_date, (x.c).last_verified_date,
       CASE
         WHEN EXISTS (SELECT 1 FROM legacy_account.pi_user l WHERE l.user_id = x.id) THEN 'already in legacy'
         WHEN (x.c).user_provenance NOT IN ('PI_AAD', 'SSO', 'CFT_IDAM', 'CRIME_IDAM') THEN format('provenance %s is not in legacy', (x.c).user_provenance)
         WHEN (x.c).role NOT IN (SELECT role FROM legacy_role) THEN format('role %s is not in legacy', (x.c).role)
         -- Legacy looks accounts up by provenance id and expects one; the user keeps their legacy account.
         WHEN EXISTS (SELECT 1 FROM legacy_account.pi_user l
                       WHERE l.user_provenance = (x.c).user_provenance
                         AND l.provenance_user_id = pg_temp.legacy_provenance_user_id((x.c).user_provenance, (x.c).user_provenance_id))
           THEN 'legacy already has an account with this provenance id'
       END AS reject_reason
  FROM x_user x WHERE x.op = 'insert';

WITH done AS (
  INSERT INTO legacy_account.pi_user (user_id, email, forenames, surname, user_provenance, provenance_user_id, roles,
                                      created_date, last_signed_in_date, last_verified_date)
  SELECT user_id, email, forenames, surname, user_provenance, provenance_user_id, roles, created_date, last_signed_in_date, last_verified_date
    FROM r_user WHERE reject_reason IS NULL
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'user', 'insert', count(*) FROM done;

-- Courtel is a THIRD_PARTY pi_user with the role legacy V1.2 gave it.
CREATE TEMP TABLE r_legacy_third_party_user ON COMMIT DROP AS
SELECT x.id, (x.c).name, (x.c).created_date,
       CASE WHEN EXISTS (SELECT 1 FROM legacy_account.pi_user l WHERE l.user_id = x.id) THEN 'already in legacy' END AS reject_reason
  FROM x_legacy_third_party_user x WHERE x.op = 'insert';

WITH done AS (
  INSERT INTO legacy_account.pi_user (user_id, email, provenance_user_id, user_provenance, roles, created_date)
  SELECT id, name, name, 'THIRD_PARTY', 'VERIFIED_THIRD_PARTY_ALL', created_date FROM r_legacy_third_party_user WHERE reject_reason IS NULL
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'legacy_third_party_user', 'insert', count(*) FROM done;

CREATE TEMP TABLE r_subscription ON COMMIT DROP AS
SELECT x.id, (x.c).user_id, (x.c).search_type, (x.c).search_value, (x.c).case_name, (x.c).case_number,
       -- Legacy shows the court name it was given at subscription time.
       CASE WHEN (x.c).search_type = 'LOCATION_ID' THEN (SELECT name FROM public.location WHERE location_id::text = (x.c).search_value) END AS location_name,
       (x.c).date_added,
       CASE
         WHEN EXISTS (SELECT 1 FROM legacy_account.subscription l WHERE l.id = x.id) THEN 'already in legacy'
         WHEN NOT EXISTS (SELECT 1 FROM legacy_account.pi_user l WHERE l.user_id = (x.c).user_id) THEN 'user not in legacy'
         WHEN EXISTS (SELECT 1 FROM legacy_account.subscription l
                       WHERE l.user_id = (x.c).user_id AND l.search_type = (x.c).search_type AND l.search_value = (x.c).search_value)
           THEN 'legacy already has this subscription'
       END AS reject_reason
  FROM x_subscription x WHERE x.op = 'insert';

WITH done AS (
  INSERT INTO legacy_account.subscription (id, user_id, search_type, search_value, case_name, case_number, channel,
                                           location_name, created_date, last_updated_date)
  SELECT id, user_id, search_type, search_value, case_name, case_number, 'EMAIL', location_name, date_added, date_added
    FROM r_subscription WHERE reject_reason IS NULL
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'subscription', 'insert', count(*) FROM done;

CREATE TEMP TABLE r_legacy_third_party_subscription ON COMMIT DROP AS
SELECT x.id, (x.c).user_id, pg_temp.legacy_list_type((x.c).list_type_id) AS list_type, (x.c).created_date,
       CASE
         WHEN EXISTS (SELECT 1 FROM legacy_account.subscription l WHERE l.id = x.id) THEN 'already in legacy'
         WHEN NOT EXISTS (SELECT 1 FROM legacy_account.pi_user l WHERE l.user_id = (x.c).user_id) THEN 'Courtel user not in legacy'
         WHEN pg_temp.legacy_list_type((x.c).list_type_id) IS NULL THEN 'list type has no legacy equivalent'
       END AS reject_reason
  FROM x_legacy_third_party_subscription x WHERE x.op = 'insert';

WITH done AS (
  INSERT INTO legacy_account.subscription (id, user_id, search_type, search_value, channel, created_date, last_updated_date)
  SELECT id, user_id, 'LIST_TYPE', list_type, 'API_COURTEL', created_date, created_date
    FROM r_legacy_third_party_subscription WHERE reject_reason IS NULL
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'legacy_third_party_subscription', 'insert', count(*) FROM done;

-- Legacy keeps one row per user. A user whose empty legacy filter the migration skipped already
-- has a row, which takes cath's list types instead.
CREATE TEMP TABLE r_subscription_list_type ON COMMIT DROP AS
SELECT x.id, (x.c).user_id, (x.c).list_type_ids, (x.c).list_language,
       (SELECT l.id FROM legacy_account.subscription_list_type l WHERE l.user_id = (x.c).user_id LIMIT 1) AS legacy_id,
       CASE
         WHEN EXISTS (SELECT 1 FROM legacy_account.subscription_list_type l WHERE l.id = x.id) THEN 'already in legacy'
         WHEN NOT EXISTS (SELECT 1 FROM legacy_account.pi_user l WHERE l.user_id = (x.c).user_id) THEN 'user not in legacy'
         WHEN cardinality(pg_temp.merge_list_types('{}', (x.c).list_type_ids)) = 0 THEN 'no list types with a legacy equivalent'
       END AS reject_reason
  FROM x_subscription_list_type x WHERE x.op = 'insert';

WITH done AS (
  UPDATE legacy_account.subscription_list_type l SET
    list_type = pg_temp.merge_list_types('{}', r.list_type_ids),
    list_language = r.list_language
    FROM r_subscription_list_type r
   WHERE r.reject_reason IS NULL AND l.id = r.legacy_id
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'subscription_list_type', 'update', count(*) FROM done;

WITH done AS (
  INSERT INTO legacy_account.subscription_list_type (id, user_id, list_type, list_language)
  SELECT id, user_id, pg_temp.merge_list_types('{}', list_type_ids), list_language
    FROM r_subscription_list_type WHERE reject_reason IS NULL AND legacy_id IS NULL
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'subscription_list_type', 'insert', count(*) FROM done;

CREATE TEMP TABLE r_third_party_user ON COMMIT DROP AS
SELECT x.id, (x.c).name, (x.c).created_at,
       CASE
         WHEN EXISTS (SELECT 1 FROM legacy_account.api_user l WHERE l.user_id = x.id) THEN 'already in legacy'
         WHEN EXISTS (SELECT 1 FROM legacy_account.api_user l WHERE l.name = (x.c).name) THEN 'legacy already has a third party with this name'
       END AS reject_reason
  FROM x_third_party_user x WHERE x.op = 'insert';

WITH done AS (
  INSERT INTO legacy_account.api_user (user_id, name, created_date, status)
  SELECT id, name, created_at, 'ACTIVE' FROM r_third_party_user WHERE reject_reason IS NULL
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'third_party_user', 'insert', count(*) FROM done;

CREATE TEMP TABLE r_third_party_subscription ON COMMIT DROP AS
SELECT x.id, (x.c).third_party_user_id AS user_id, pg_temp.legacy_list_type((x.c).list_type_id) AS list_type, (x.c).sensitivity,
       CASE
         WHEN EXISTS (SELECT 1 FROM legacy_account.api_subscription l WHERE l.id = x.id) THEN 'already in legacy'
         WHEN NOT EXISTS (SELECT 1 FROM legacy_account.api_user l WHERE l.user_id = (x.c).third_party_user_id) THEN 'third party not in legacy'
         WHEN pg_temp.legacy_list_type((x.c).list_type_id) IS NULL THEN 'list type has no legacy equivalent'
       END AS reject_reason
  FROM x_third_party_subscription x WHERE x.op = 'insert';

WITH done AS (
  INSERT INTO legacy_account.api_subscription (id, user_id, list_type, sensitivity, created_date, last_updated_date)
  SELECT id, user_id, list_type, sensitivity, now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC'
    FROM r_third_party_subscription WHERE reject_reason IS NULL
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'third_party_subscription', 'insert', count(*) FROM done;

-- Proof of ID goes to pip files/<id>; the file copy script copies it.
CREATE TEMP TABLE r_media_application ON COMMIT DROP AS
SELECT x.id, (x.c).name, (x.c).email, (x.c).employer, (x.c).status, (x.c).applied_date,
       CASE WHEN (x.c).proof_of_id_path IS NOT NULL THEN x.id::text END AS image, (x.c).proof_of_id_original_name AS image_name,
       CASE WHEN EXISTS (SELECT 1 FROM legacy_account.media_application l WHERE l.id = x.id) THEN 'already in legacy' END AS reject_reason
  FROM x_media_application x WHERE x.op = 'insert';

WITH done AS (
  INSERT INTO legacy_account.media_application (id, full_name, email, employer, image, image_name, request_date, status, status_date)
  SELECT id, name, email, employer, image, image_name, applied_date, status, applied_date FROM r_media_application WHERE reject_reason IS NULL
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'media_application', 'insert', count(*) FROM done;

CREATE TEMP TABLE r_audit_log ON COMMIT DROP AS
SELECT x.id::text AS cath_id, pg_temp.as_uuid(x.id::text) AS id, (x.c).action, left((x.c).details, 255) AS details, (x.c)."timestamp",
       (x.c).user_id, (x.c).user_email, (x.c).user_role, (x.c).user_provenance,
       CASE
         WHEN EXISTS (SELECT 1 FROM legacy_account.audit_log l WHERE l.id = pg_temp.as_uuid(x.id::text)) THEN 'already in legacy'
         WHEN (x.c).action NOT IN (SELECT action FROM legacy_audit_action) THEN format('action %s is not in legacy', (x.c).action)
       END AS reject_reason
  FROM x_audit_log x;

WITH done AS (
  INSERT INTO legacy_account.audit_log (id, action, details, "timestamp", user_email, user_id, roles, user_provenance)
  SELECT id, action, details, "timestamp", user_email, user_id, user_role, user_provenance FROM r_audit_log WHERE reject_reason IS NULL
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'audit_log', 'insert', count(*) FROM done;

CREATE TEMP TABLE r_user_archive ON COMMIT DROP AS
SELECT x.id, (x.c).user_provenance, (x.c).provenance_user_id, (x.c).email, (x.c).roles, (x.c).last_signed_in_date, (x.c).archived_date,
       CASE WHEN EXISTS (SELECT 1 FROM legacy_account.pi_user_archived l WHERE l.user_id = x.id) THEN 'already in legacy' END AS reject_reason
  FROM x_user_archive x;

WITH done AS (
  INSERT INTO legacy_account.pi_user_archived (user_id, user_provenance, provenance_user_id, email, roles, last_signed_in_date, archived_date)
  SELECT id, user_provenance, provenance_user_id, email, roles, last_signed_in_date, archived_date FROM r_user_archive WHERE reject_reason IS NULL
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'user_archive', 'insert', count(*) FROM done;

-- ---------------------------------------------------------------------------------------------
-- Data management: deletes, updates, then inserts. Artefact times go back to London time.
-- ---------------------------------------------------------------------------------------------

WITH done AS (
  DELETE FROM legacy_publication.location_metadata l USING x_location_metadata x
   WHERE x.op = 'delete' AND l.location_metadata_id = pg_temp.as_uuid(x.id::text)
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'location_metadata', 'delete', count(*) FROM done;

WITH done AS (
  DELETE FROM legacy_publication.list_search_config l USING x_list_search_config x
   WHERE x.op = 'delete' AND l.id = pg_temp.as_uuid(x.id::text)
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'list_search_config', 'delete', count(*) FROM done;

-- Cascades to artefact_search.
WITH done AS (
  DELETE FROM legacy_publication.artefact l USING x_artefact x WHERE x.op = 'delete' AND l.artefact_id = x.id
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'artefact', 'delete', count(*) FROM done;

WITH done AS (
  UPDATE legacy_publication.location_metadata l SET
    caution_message = (x.c).caution_message,
    welsh_caution_message = (x.c).welsh_caution_message,
    no_list_message = (x.c).no_list_message,
    welsh_no_list_message = (x.c).welsh_no_list_message
    FROM x_location_metadata x
   WHERE x.op = 'update' AND l.location_metadata_id = pg_temp.as_uuid(x.id::text)
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'location_metadata', 'update', count(*) FROM done;

-- Cath stores an unset field name as blank; legacy as null.
WITH done AS (
  UPDATE legacy_publication.list_search_config l SET
    case_number_field_name = nullif((x.c).case_number_field_name, ''),
    case_name_field_name = nullif((x.c).case_name_field_name, '')
    FROM x_list_search_config x
   WHERE x.op = 'update' AND l.id = pg_temp.as_uuid(x.id::text)
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'list_search_config', 'update', count(*) FROM done;

-- A new last_received_date means cath took a new payload, so pip points at the copy
-- the file copy script makes. A new blob name, because legacy V1.25 left some artefacts
-- sharing one.
WITH done AS (
  UPDATE legacy_publication.artefact l SET
    sensitivity = CASE WHEN (x.c).sensitivity IS DISTINCT FROM (x.b).sensitivity THEN (x.c).sensitivity ELSE l.sensitivity END,
    display_from = CASE WHEN (x.c).display_from IS DISTINCT FROM (x.b).display_from THEN pg_temp.utc_to_london((x.c).display_from) ELSE l.display_from END,
    display_to = CASE WHEN (x.c).display_to IS DISTINCT FROM (x.b).display_to THEN pg_temp.utc_to_london((x.c).display_to) ELSE l.display_to END,
    is_flat_file = CASE WHEN (x.c).is_flat_file IS DISTINCT FROM (x.b).is_flat_file THEN (x.c).is_flat_file ELSE l.is_flat_file END,
    source_artefact_id = CASE WHEN (x.c).source_artefact_id IS DISTINCT FROM (x.b).source_artefact_id THEN (x.c).source_artefact_id ELSE l.source_artefact_id END,
    superseded_count = CASE WHEN (x.c).superseded_count IS DISTINCT FROM (x.b).superseded_count THEN (x.c).superseded_count ELSE l.superseded_count END,
    last_received_date = CASE WHEN (x.c).last_received_date IS DISTINCT FROM (x.b).last_received_date THEN pg_temp.utc_to_london((x.c).last_received_date) ELSE l.last_received_date END,
    payload = CASE WHEN (x.c).last_received_date IS DISTINCT FROM (x.b).last_received_date
                   THEN format('https://%s.blob.core.windows.net/artefact/%s', :'legacy_storage', x.id) ELSE l.payload END
    FROM x_artefact x
   WHERE x.op = 'update' AND l.artefact_id = x.id
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'artefact', 'update', count(*) FROM done;

CREATE TEMP TABLE r_location_metadata ON COMMIT DROP AS
SELECT x.id::text AS cath_id, pg_temp.as_uuid(x.id::text) AS id, (x.c).location_id, (x.c).caution_message, (x.c).welsh_caution_message,
       (x.c).no_list_message, (x.c).welsh_no_list_message,
       CASE
         WHEN EXISTS (SELECT 1 FROM legacy_publication.location_metadata l WHERE l.location_metadata_id = pg_temp.as_uuid(x.id::text)) THEN 'already in legacy'
         WHEN NOT EXISTS (SELECT 1 FROM legacy_publication.location l WHERE l.location_id = (x.c).location_id) THEN format('location %s not in legacy', (x.c).location_id)
         WHEN EXISTS (SELECT 1 FROM legacy_publication.location_metadata l WHERE l.location_id = (x.c).location_id)
           THEN 'legacy already has metadata for this location'
       END AS reject_reason
  FROM x_location_metadata x WHERE x.op = 'insert';

WITH done AS (
  INSERT INTO legacy_publication.location_metadata (location_metadata_id, location_id, caution_message, welsh_caution_message,
                                                    no_list_message, welsh_no_list_message)
  SELECT id, location_id, caution_message, welsh_caution_message, no_list_message, welsh_no_list_message
    FROM r_location_metadata WHERE reject_reason IS NULL
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'location_metadata', 'insert', count(*) FROM done;

CREATE TEMP TABLE r_list_search_config ON COMMIT DROP AS
SELECT x.id::text AS cath_id, pg_temp.as_uuid(x.id::text) AS id, pg_temp.legacy_list_type((x.c).list_type_id) AS list_type,
       nullif((x.c).case_number_field_name, '') AS case_number_field_name, nullif((x.c).case_name_field_name, '') AS case_name_field_name,
       CASE
         WHEN EXISTS (SELECT 1 FROM legacy_publication.list_search_config l WHERE l.id = pg_temp.as_uuid(x.id::text)) THEN 'already in legacy'
         WHEN pg_temp.legacy_list_type((x.c).list_type_id) IS NULL THEN 'list type has no legacy equivalent'
         WHEN EXISTS (SELECT 1 FROM legacy_publication.list_search_config l WHERE l.list_type = pg_temp.legacy_list_type((x.c).list_type_id))
           THEN 'legacy already has a config for this list type'
       END AS reject_reason
  FROM x_list_search_config x WHERE x.op = 'insert';

WITH done AS (
  INSERT INTO legacy_publication.list_search_config (id, list_type, case_number_field_name, case_name_field_name)
  SELECT id, list_type, case_number_field_name, case_name_field_name FROM r_list_search_config WHERE reject_reason IS NULL
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'list_search_config', 'insert', count(*) FROM done;

-- payload_size and search are left for legacy to treat as unknown: nothing reads them after upload.
CREATE TEMP TABLE r_artefact ON COMMIT DROP AS
SELECT x.id AS artefact_id, (x.c).type, (x.c).location_id, pg_temp.legacy_list_type((x.c).list_type_id) AS list_type,
       (x.c).content_date::timestamp AS content_date, (x.c).sensitivity,
       CASE (x.c).language WHEN 'BILINGUAL' THEN 'BI_LINGUAL' ELSE (x.c).language END AS language,
       pg_temp.utc_to_london((x.c).display_from) AS display_from, pg_temp.utc_to_london((x.c).display_to) AS display_to,
       pg_temp.utc_to_london((x.c).last_received_date) AS last_received_date, (x.c).is_flat_file, (x.c).provenance,
       (x.c).superseded_count, (x.c).source_artefact_id,
       format('https://%s.blob.core.windows.net/artefact/%s', :'legacy_storage', x.id) AS payload,
       CASE
         WHEN EXISTS (SELECT 1 FROM legacy_publication.artefact l WHERE l.artefact_id = x.id) THEN 'already in legacy'
         WHEN pg_temp.legacy_list_type((x.c).list_type_id) IS NULL THEN 'list type has no legacy equivalent'
         -- Legacy keeps one publication per key; the legacy one stays.
         WHEN EXISTS (SELECT 1 FROM legacy_publication.artefact l
                       WHERE l.location_id = (x.c).location_id AND l.content_date = (x.c).content_date::timestamp
                         AND l.language = CASE (x.c).language WHEN 'BILINGUAL' THEN 'BI_LINGUAL' ELSE (x.c).language END
                         AND l.list_type = pg_temp.legacy_list_type((x.c).list_type_id) AND l.provenance = (x.c).provenance)
           THEN 'legacy already has a publication for this court, date, language, list type and provenance'
       END AS reject_reason
  FROM x_artefact x WHERE x.op = 'insert';

WITH done AS (
  INSERT INTO legacy_publication.artefact (artefact_id, type, location_id, list_type, content_date, sensitivity, language,
                                           display_from, display_to, last_received_date, is_flat_file, provenance,
                                           superseded_count, source_artefact_id, payload, search)
  SELECT artefact_id, type, location_id, list_type, content_date, sensitivity, language, display_from, display_to,
         last_received_date, is_flat_file, provenance, superseded_count, source_artefact_id, payload, '{}'
    FROM r_artefact WHERE reject_reason IS NULL
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'artefact', 'insert', count(*) FROM done;

-- Case search rows follow the payload: replaced for every artefact written above with new content.
CREATE TEMP TABLE search_refresh ON COMMIT DROP AS
SELECT artefact_id FROM r_artefact WHERE reject_reason IS NULL
UNION
SELECT id FROM x_artefact x WHERE x.op = 'update' AND (x.c).last_received_date IS DISTINCT FROM (x.b).last_received_date
   AND EXISTS (SELECT 1 FROM legacy_publication.artefact l WHERE l.artefact_id = x.id);

DELETE FROM legacy_publication.artefact_search l USING search_refresh r WHERE l.artefact_id = r.artefact_id;
WITH done AS (
  INSERT INTO legacy_publication.artefact_search (id, artefact_id, case_number, case_name)
  SELECT pg_temp.as_uuid(s.id::text), s.artefact_id, s.case_number, left(s.case_name, 255)
    FROM public.artefact_search s JOIN search_refresh r USING (artefact_id)
  RETURNING 1
)
INSERT INTO rollback_write SELECT 'artefact_search', 'insert', count(*) FROM done;

-- ---------------------------------------------------------------------------------------------
-- Report
-- ---------------------------------------------------------------------------------------------

INSERT INTO rollback_rejection
          SELECT 'user', user_id::text, reject_reason FROM r_user WHERE reject_reason IS NOT NULL
UNION ALL SELECT 'legacy_third_party_user', id::text, reject_reason FROM r_legacy_third_party_user WHERE reject_reason IS NOT NULL
UNION ALL SELECT 'subscription', id::text, reject_reason FROM r_subscription WHERE reject_reason IS NOT NULL
UNION ALL SELECT 'legacy_third_party_subscription', id::text, reject_reason FROM r_legacy_third_party_subscription WHERE reject_reason IS NOT NULL
UNION ALL SELECT 'subscription_list_type', id::text, reject_reason FROM r_subscription_list_type WHERE reject_reason IS NOT NULL
UNION ALL SELECT 'third_party_user', id::text, reject_reason FROM r_third_party_user WHERE reject_reason IS NOT NULL
UNION ALL SELECT 'third_party_subscription', id::text, reject_reason FROM r_third_party_subscription WHERE reject_reason IS NOT NULL
UNION ALL SELECT 'media_application', id::text, reject_reason FROM r_media_application WHERE reject_reason IS NOT NULL
UNION ALL SELECT 'audit_log', cath_id, reject_reason FROM r_audit_log WHERE reject_reason IS NOT NULL
UNION ALL SELECT 'user_archive', id::text, reject_reason FROM r_user_archive WHERE reject_reason IS NOT NULL
UNION ALL SELECT 'location_metadata', cath_id, reject_reason FROM r_location_metadata WHERE reject_reason IS NOT NULL
UNION ALL SELECT 'list_search_config', cath_id, reject_reason FROM r_list_search_config WHERE reject_reason IS NOT NULL
UNION ALL SELECT 'artefact', artefact_id::text, reject_reason FROM r_artefact WHERE reject_reason IS NOT NULL
-- New third parties need their OAuth configuration set up in legacy by hand.
UNION ALL SELECT 'third_party_user', id::text, 'written without OAuth configuration: set it up in legacy'
            FROM r_third_party_user WHERE reject_reason IS NULL;

\echo
\echo 'Rows written to legacy'
SELECT table_name, op, sum(rows) AS rows FROM rollback_write GROUP BY table_name, op HAVING sum(rows) > 0 ORDER BY table_name, op;

\echo 'Not written, by reason, with up to five cath ids each. "already in legacy" means an earlier run wrote it.'
SELECT table_name, reason, count(*) AS rows, array_to_string((array_agg(cath_id ORDER BY cath_id))[1:5], ', ') AS example_ids
  FROM rollback_rejection
 GROUP BY table_name, reason
 ORDER BY table_name, count(*) DESC, reason;

\if :apply
-- The file copy script, written next to where psql runs. QUIET and tuples-only keep it to the
-- commands themselves.
\set QUIET on
\pset format unaligned
\pset tuples_only on
\pset footer off
\o :files_script
CREATE FUNCTION pg_temp.shell_quote(value text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT '''' || replace(value, '''', '''"''"''') || ''''
$$;

-- A publication written above points at artefact/<artefactId>; migrated ones still point
-- at legacy's own randomly named blob, so they are left alone.
CREATE TEMP TABLE written_artefact ON COMMIT DROP AS
SELECT a.artefact_id
  FROM public.artefact a
  JOIN legacy_publication.artefact l USING (artefact_id)
 WHERE l.payload = format('https://%s.blob.core.windows.net/artefact/%s', :'legacy_storage', a.artefact_id);

SELECT '#!/usr/bin/env bash';

SELECT format('azcopy copy %s %s',
              pg_temp.shell_quote(format('https://%s.blob.core.windows.net/artefact/%s', :'cath_storage', artefact_id)),
              pg_temp.shell_quote(format('https://%s.blob.core.windows.net/artefact/%s', :'legacy_storage', artefact_id)))
  FROM written_artefact
 ORDER BY artefact_id;

-- Same names in both. Cath makes no <id>_cy.pdf, so Welsh and bilingual lists go back without one.
-- Names that don't exist are skipped by azcopy. Batches keep each pattern under the 128KB
-- limit on one argument.
SELECT format('azcopy copy %s %s --include-pattern %s',
              pg_temp.shell_quote(format('https://%s.blob.core.windows.net/publications/*', :'cath_storage')),
              pg_temp.shell_quote(format('https://%s.blob.core.windows.net/publications/', :'legacy_storage')),
              pg_temp.shell_quote(string_agg(format('%s.pdf;%s.xlsx', artefact_id, artefact_id), ';' ORDER BY artefact_id)))
  FROM (SELECT artefact_id, (row_number() OVER (ORDER BY artefact_id) - 1) / 1000 AS batch FROM written_artefact) batched
 GROUP BY batch
 ORDER BY batch;

-- An application written above has the application id as its image.
SELECT format('azcopy copy %s %s',
              pg_temp.shell_quote(format('https://%s.blob.core.windows.net/files/%s', :'cath_storage', m.proof_of_id_path)),
              pg_temp.shell_quote(format('https://%s.blob.core.windows.net/files/%s', :'legacy_storage', m.id)))
  FROM public.media_application m
  JOIN legacy_account.media_application l USING (id)
 WHERE l.image = m.id::text AND m.proof_of_id_path IS NOT NULL
 ORDER BY m.id;
\o
\pset format aligned
\pset tuples_only off
\set QUIET off

DROP SERVER legacy_account CASCADE;
DROP SERVER legacy_publication CASCADE;
DROP SCHEMA legacy_account;
DROP SCHEMA legacy_publication;
COMMIT;
\echo 'Applied. Copy the files next: bash' :files_script
\else
ROLLBACK;
\echo 'Dry run: nothing was written. Run with -v apply=1 to apply.'
\endif
