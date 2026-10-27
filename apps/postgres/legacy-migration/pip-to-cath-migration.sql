-- Migrates pip (legacy CaTH: pip-account-management and pip-data-management) into cath.
-- See docs/migration/legacy-data-migration.md.
--
-- export PIP_ACCOUNT_PASSWORD PIP_PUBLICATION_PASSWORD     (read -rsp keeps them out of history)
-- psql "$DATABASE_URL" -f pip-to-cath-migration.sql -v env=<env> \
--   -v account_host=flexible-pip-account-management-<env>.postgres.database.azure.com \
--   -v account_dbname=accountmanagement -v account_user=<login> \
--   -v publication_host=flexible-pip-data-management-<env>.postgres.database.azure.com \
--   -v publication_dbname=datamanagement -v publication_user=<login> \
--   -v legacy_storage=<pip storage account> -v cath_storage=<cath storage account> \
--   -v cath_vault=cath-tp-<env> [-v legacy_vault=<pip OAuth vault>] [-v apply=1]
--
-- Without -v apply=1 it is a dry run: it reports, then rolls back. With it, it commits and
-- writes pip-to-cath-files.sh (or -v files_script=<path>), which copies the files and secrets
-- of the migrated rows: run it with bash after `azcopy login` and `az login`.
--
-- Everything runs in one transaction, so pip is read as one snapshot and a failure leaves cath
-- untouched. An applied run saves the migrated tables into legacy_migration_baseline, which
-- cath-to-pip-migration.sql compares against to find what cath has changed since.

\set ON_ERROR_STOP on

\if :{?env} \else \set missing 1 \echo 'pass -v env=<value>' \endif
\if :{?account_host} \else \set missing 1 \echo 'pass -v account_host=<value>' \endif
\if :{?account_dbname} \else \set missing 1 \echo 'pass -v account_dbname=<value>' \endif
\if :{?account_user} \else \set missing 1 \echo 'pass -v account_user=<value>' \endif
\if :{?publication_host} \else \set missing 1 \echo 'pass -v publication_host=<value>' \endif
\if :{?publication_dbname} \else \set missing 1 \echo 'pass -v publication_dbname=<value>' \endif
\if :{?publication_user} \else \set missing 1 \echo 'pass -v publication_user=<value>' \endif
\if :{?legacy_storage} \else \set missing 1 \echo 'pass -v legacy_storage=<value>' \endif
\if :{?cath_storage} \else \set missing 1 \echo 'pass -v cath_storage=<value>' \endif
\if :{?cath_vault} \else \set missing 1 \echo 'pass -v cath_vault=<value>' \endif
\getenv account_password PIP_ACCOUNT_PASSWORD
\getenv publication_password PIP_PUBLICATION_PASSWORD
\if :{?account_password} \else \set missing 1 \echo 'export PIP_ACCOUNT_PASSWORD' \endif
\if :{?publication_password} \else \set missing 1 \echo 'export PIP_PUBLICATION_PASSWORD' \endif
\if :{?missing}
DO $$ BEGIN RAISE EXCEPTION 'settings missing, listed above'; END $$;
\endif
\if :{?files_script} \else \set files_script pip-to-cath-files.sh \endif

-- An applied run replaces every user and subscription the E2E tests rely on.
\if :{?apply}
SELECT :'env' = 'aat' AS is_aat \gset
\if :is_aat
DO $$ BEGIN RAISE EXCEPTION 'refusing to apply to aat: it would wipe the E2E users and subscriptions'; END $$;
\endif
-- A second apply replaces everything cath has written since the first.
\if :{?replace}
\else
DO $$
BEGIN
  IF to_regnamespace('legacy_migration_baseline') IS NOT NULL THEN
    RAISE EXCEPTION 'a migration was already applied, and applying again replaces everything cath has written since. Run cath-to-pip-migration.sql first if those changes must reach pip, then rerun with -v replace=1';
  END IF;
END $$;
\endif
\endif

BEGIN;

-- ---------------------------------------------------------------------------------------------
-- Connect to pip. Created inside the transaction and dropped before it commits, so the pip
-- passwords are never stored in the cath database.
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
  LIMIT TO (location_metadata, list_search_config, artefact, artefact_search)
  FROM SERVER legacy_publication INTO legacy_publication;

-- ---------------------------------------------------------------------------------------------
-- Mappings. cath-to-pip-migration.sql has the same ones; keep them in step.
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

-- ---------------------------------------------------------------------------------------------
-- Transforms. Each m_* table holds every legacy row in scope with the values to load, and a
-- reject_reason that is null for rows that load. Artefact times are converted from London time.
-- ---------------------------------------------------------------------------------------------

CREATE TEMP TABLE m_user ON COMMIT DROP AS
SELECT u.user_id,
       lower(trim(u.email)) AS email,
       u.forenames AS first_name,
       u.surname,
       u.user_provenance,
       -- The Crime IDAM sign-in namespaces its subject, or the user is treated as new on sign-in.
       CASE WHEN u.user_provenance = 'CRIME_IDAM' THEN 'CRIME_IDAM:' || u.provenance_user_id ELSE u.provenance_user_id END AS user_provenance_id,
       r.role,
       coalesce(u.created_date, 'epoch') AS created_date,
       u.last_signed_in_date,
       u.last_verified_date,
       CASE
         WHEN u.user_provenance IS NULL OR u.user_provenance NOT IN ('PI_AAD', 'SSO', 'CFT_IDAM', 'CRIME_IDAM')
           THEN format('provenance %s is not a sign-in user', u.user_provenance)
         WHEN nullif(trim(u.email), '') IS NULL THEN 'missing email'
         WHEN u.provenance_user_id IS NULL THEN 'missing provenance_user_id'
         WHEN r.role IS NULL THEN format('unmapped role %s', u.roles)
       END AS reject_reason
  FROM legacy_account.pi_user u
  LEFT JOIN role_map r ON r.legacy_role = u.roles
 -- Courtel third parties go to legacy_third_party_user instead.
 WHERE u.user_provenance IS DISTINCT FROM 'THIRD_PARTY';

UPDATE m_user SET reject_reason = 'duplicate provenance_user_id in legacy'
 WHERE user_id IN (
   SELECT user_id FROM (
     SELECT user_id, row_number() OVER (PARTITION BY user_provenance_id ORDER BY created_date, user_id) AS n
       FROM m_user WHERE reject_reason IS NULL
   ) ranked WHERE n > 1
 );

CREATE TEMP TABLE m_subscription ON COMMIT DROP AS
SELECT s.id AS subscription_id,
       s.user_id,
       st.search_type,
       s.search_value,
       s.case_name,
       CASE WHEN st.search_type = 'CASE_NUMBER' THEN coalesce(s.case_number, s.search_value) ELSE s.case_number END AS case_number,
       coalesce(s.created_date, 'epoch') AS date_added,
       CASE
         WHEN NOT EXISTS (SELECT 1 FROM m_user u WHERE u.user_id = s.user_id AND u.reject_reason IS NULL) THEN 'user not migrated'
         WHEN st.search_type IS NULL THEN format('unmapped search type %s', s.search_type)
         WHEN st.search_type = 'LOCATION_ID' AND NOT EXISTS (SELECT 1 FROM public.location l WHERE l.location_id::text = s.search_value)
           THEN format('unknown location %s', s.search_value)
       END AS reject_reason
  FROM legacy_account.subscription s
  LEFT JOIN search_type_map st ON st.legacy_search_type = s.search_type
 -- Courtel subscriptions go to legacy_third_party_subscription instead.
 WHERE s.channel IS DISTINCT FROM 'API_COURTEL';

-- CASE_ID and CASE_URN copies of one subscription (legacy V1.16) collapse onto one key; the oldest is kept.
UPDATE m_subscription SET reject_reason = 'duplicate of an older subscription after search type mapping'
 WHERE subscription_id IN (
   SELECT subscription_id FROM (
     SELECT subscription_id,
            row_number() OVER (PARTITION BY user_id, search_type, search_value ORDER BY date_added, subscription_id) AS n
       FROM m_subscription WHERE reject_reason IS NULL
   ) ranked WHERE n > 1
 );

CREATE TEMP TABLE m_subscription_list_type ON COMMIT DROP AS
SELECT l.id AS subscription_list_type_id,
       l.user_id,
       ARRAY(SELECT DISTINCT pg_temp.list_type_id(name) FROM unnest(l.list_type) name
              WHERE pg_temp.list_type_id(name) IS NOT NULL ORDER BY 1) AS list_type_ids,
       ARRAY(SELECT name FROM unnest(l.list_type) name WHERE pg_temp.list_type_id(name) IS NULL) AS dropped_names,
       ARRAY(SELECT language FROM unnest(l.list_language) language ORDER BY 1) AS list_language,
       l.list_type AS legacy_list_type
  FROM legacy_account.subscription_list_type l;

ALTER TABLE m_subscription_list_type ADD COLUMN reject_reason text;
UPDATE m_subscription_list_type SET reject_reason = CASE
  WHEN NOT EXISTS (SELECT 1 FROM m_user u WHERE u.user_id = m_subscription_list_type.user_id AND u.reject_reason IS NULL) THEN 'user not migrated'
  -- Legacy reads an empty filter as every list type at the user's locations, which here means no row.
  WHEN coalesce(cardinality(legacy_list_type), 0) = 0 THEN 'empty list type filter is not migrated'
  WHEN cardinality(list_type_ids) = 0 THEN 'no list types could be mapped'
  WHEN cardinality(list_language) = 0 OR NOT list_language <@ ARRAY['ENGLISH', 'WELSH']
    THEN format('unsupported list language %s', array_to_string(list_language, ','))
END;

-- user_id is unique here.
UPDATE m_subscription_list_type SET reject_reason = 'duplicate list type subscription for user'
 WHERE subscription_list_type_id IN (
   SELECT subscription_list_type_id FROM (
     SELECT subscription_list_type_id, row_number() OVER (PARTITION BY user_id ORDER BY subscription_list_type_id) AS n
       FROM m_subscription_list_type WHERE reject_reason IS NULL
   ) ranked WHERE n > 1
 );

CREATE TEMP TABLE m_legacy_third_party_user ON COMMIT DROP AS
SELECT u.user_id AS id,
       u.provenance_user_id AS name,
       coalesce(u.created_date, 'epoch') AS created_date,
       CASE WHEN nullif(trim(u.provenance_user_id), '') IS NULL THEN 'missing name' END AS reject_reason
  FROM legacy_account.pi_user u
 WHERE u.user_provenance = 'THIRD_PARTY';

CREATE TEMP TABLE m_legacy_third_party_subscription ON COMMIT DROP AS
SELECT s.id,
       s.user_id,
       pg_temp.list_type_id(s.search_value) AS list_type_id,
       coalesce(s.created_date, 'epoch') AS created_date,
       CASE
         WHEN NOT EXISTS (SELECT 1 FROM m_legacy_third_party_user u WHERE u.id = s.user_id AND u.reject_reason IS NULL)
           THEN 'Courtel subscription for a user that is not a legacy third party'
         WHEN s.search_type IS DISTINCT FROM 'LIST_TYPE' THEN format('Courtel subscription by %s is not supported', s.search_type)
         WHEN pg_temp.list_type_id(s.search_value) IS NULL THEN format('unknown list type %s', s.search_value)
       END AS reject_reason
  FROM legacy_account.subscription s
 WHERE s.channel = 'API_COURTEL';

UPDATE m_legacy_third_party_subscription SET reject_reason = 'duplicate Courtel subscription for list type'
 WHERE id IN (
   SELECT id FROM (
     SELECT id, row_number() OVER (PARTITION BY user_id, list_type_id ORDER BY created_date, id) AS n
       FROM m_legacy_third_party_subscription WHERE reject_reason IS NULL
   ) ranked WHERE n > 1
 );

-- third_party_user has no status column, so anything migrated would look live.
CREATE TEMP TABLE m_third_party_user ON COMMIT DROP AS
SELECT u.user_id AS id,
       trim(u.name) AS name,
       coalesce(u.created_date, 'epoch') AS created_at,
       CASE
         WHEN u.status IS DISTINCT FROM 'ACTIVE' THEN format('status %s is not migrated', u.status)
         WHEN nullif(trim(u.name), '') IS NULL THEN 'missing name'
       END AS reject_reason
  FROM legacy_account.api_user u;

CREATE TEMP TABLE m_third_party_subscription ON COMMIT DROP AS
SELECT s.id,
       s.user_id AS third_party_user_id,
       pg_temp.list_type_id(s.list_type) AS list_type_id,
       s.sensitivity,
       CASE
         WHEN NOT EXISTS (SELECT 1 FROM m_third_party_user u WHERE u.id = s.user_id AND u.reject_reason IS NULL) THEN 'third party not migrated'
         WHEN pg_temp.list_type_id(s.list_type) IS NULL THEN format('unknown list type %s', s.list_type)
         WHEN s.sensitivity IS NULL OR s.sensitivity NOT IN ('PUBLIC', 'PRIVATE', 'CLASSIFIED') THEN format('unsupported sensitivity %s', s.sensitivity)
       END AS reject_reason
  FROM legacy_account.api_subscription s;

-- Duplicates may differ in sensitivity, so the one granting the least access is kept.
UPDATE m_third_party_subscription SET reject_reason = 'duplicate subscription for list type'
 WHERE id IN (
   SELECT id FROM (
     SELECT id, row_number() OVER (PARTITION BY third_party_user_id, list_type_id
                                   ORDER BY array_position(ARRAY['PUBLIC', 'PRIVATE', 'CLASSIFIED'], sensitivity), id) AS n
       FROM m_third_party_subscription WHERE reject_reason IS NULL
   ) ranked WHERE n > 1
 );

-- Approved and rejected applications have already lost their proof of ID and are purged by legacy.
CREATE TEMP TABLE m_media_application ON COMMIT DROP AS
SELECT a.id,
       trim(a.full_name) AS name,
       lower(trim(a.email)) AS email,
       trim(a.employer) AS employer,
       -- Same key the upload page writes, so the admin proof-of-ID page finds it.
       a.id::text || lower(substring(a.image_name FROM '(\.[^./]+)$')) AS proof_of_id_path,
       a.image_name AS proof_of_id_original_name,
       coalesce(a.request_date, 'epoch') AS applied_date,
       CASE
         WHEN nullif(trim(a.full_name), '') IS NULL OR nullif(trim(a.email), '') IS NULL OR nullif(trim(a.employer), '') IS NULL
           THEN 'missing name, email or employer'
         WHEN a.image IS NULL OR a.image_name IS NULL THEN 'missing proof of ID'
         WHEN coalesce(lower(substring(a.image_name FROM '(\.[^./]+)$')), '') NOT IN ('.pdf', '.jpg', '.jpeg', '.png')
           THEN format('unsupported proof of ID type %s', coalesce(lower(substring(a.image_name FROM '(\.[^./]+)$')), '(none)'))
       END AS reject_reason
  FROM legacy_account.media_application a
 WHERE a.status = 'PENDING';

-- Legacy deletes audit entries older than 90 days, so this is all there is.
CREATE TEMP TABLE m_audit_log ON COMMIT DROP AS
SELECT a.id::text AS id,
       a."timestamp",
       a.action,
       a.details,
       a.user_id,
       a.user_email,
       a.roles AS user_role,
       a.user_provenance,
       CASE
         WHEN a.user_id IS NULL OR a.user_email IS NULL OR a.roles IS NULL OR a.user_provenance IS NULL OR a.action IS NULL OR a."timestamp" IS NULL
           THEN 'missing a required audit field'
       END AS reject_reason
  FROM legacy_account.audit_log a
 WHERE a."timestamp" >= (now() AT TIME ZONE 'UTC') - interval '90 days';

-- Historical records, copied as legacy recorded them, including provenances not migrated as users.
CREATE TEMP TABLE m_user_archive ON COMMIT DROP AS
SELECT a.user_id,
       a.user_provenance,
       a.provenance_user_id,
       a.email,
       a.roles,
       a.last_signed_in_date,
       a.archived_date,
       CASE WHEN a.archived_date IS NULL THEN 'missing archived date' END AS reject_reason
  FROM legacy_account.pi_user_archived a;

CREATE TEMP TABLE m_location_metadata ON COMMIT DROP AS
SELECT m.location_metadata_id::text AS location_metadata_id,
       m.location_id,
       nullif(trim(m.caution_message), '') AS caution_message,
       nullif(trim(m.welsh_caution_message), '') AS welsh_caution_message,
       nullif(trim(m.no_list_message), '') AS no_list_message,
       nullif(trim(m.welsh_no_list_message), '') AS welsh_no_list_message,
       CASE
         WHEN NOT EXISTS (SELECT 1 FROM public.location l WHERE l.location_id = m.location_id) THEN format('unknown location %s', m.location_id)
         WHEN coalesce(nullif(trim(m.caution_message), ''), nullif(trim(m.welsh_caution_message), ''),
                       nullif(trim(m.no_list_message), ''), nullif(trim(m.welsh_no_list_message), '')) IS NULL
           THEN 'no message'
       END AS reject_reason
  FROM legacy_publication.location_metadata m;

-- A config may set one field name; the other is stored blank, which the search extractor skips.
CREATE TEMP TABLE m_list_search_config ON COMMIT DROP AS
SELECT c.id::text AS id,
       pg_temp.list_type_id(c.list_type) AS list_type_id,
       coalesce(trim(c.case_number_field_name), '') AS case_number_field_name,
       coalesce(trim(c.case_name_field_name), '') AS case_name_field_name,
       CASE
         WHEN pg_temp.list_type_id(c.list_type) IS NULL THEN format('unknown list type %s', c.list_type)
         WHEN coalesce(trim(c.case_number_field_name), '') = '' AND coalesce(trim(c.case_name_field_name), '') = ''
           THEN 'missing case number and case name field names'
         WHEN length(trim(c.case_number_field_name)) > 100 OR length(trim(c.case_name_field_name)) > 100
           THEN 'field name longer than 100 characters'
       END AS reject_reason
  FROM legacy_publication.list_search_config c;

UPDATE m_list_search_config SET reject_reason = 'duplicate config for list type'
 WHERE id IN (
   SELECT id FROM (
     SELECT id, row_number() OVER (PARTITION BY list_type_id ORDER BY id) AS n
       FROM m_list_search_config WHERE reject_reason IS NULL
   ) ranked WHERE n > 1
 );

-- Expired artefacts are about to be archived by legacy, so only displayable ones are migrated.
CREATE TEMP TABLE m_artefact ON COMMIT DROP AS
SELECT a.artefact_id,
       a.type,
       a.location_id,
       pg_temp.list_type_id(a.list_type) AS list_type_id,
       a.content_date::date AS content_date,
       a.sensitivity,
       CASE a.language WHEN 'BI_LINGUAL' THEN 'BILINGUAL' ELSE a.language END AS language,
       pg_temp.london_to_utc(a.display_from) AS display_from,
       pg_temp.london_to_utc(a.display_to) AS display_to,
       coalesce(pg_temp.london_to_utc(a.last_received_date), 'epoch') AS last_received_date,
       coalesce(a.is_flat_file, false) AS is_flat_file,
       a.provenance,
       coalesce(a.superseded_count, 0) AS superseded_count,
       a.source_artefact_id,
       CASE
         WHEN pg_temp.list_type_id(a.list_type) IS NULL THEN format('unknown list type %s', a.list_type)
         -- This service only renders lists.
         WHEN a.type IS DISTINCT FROM 'LIST' THEN format('artefact type %s is not supported', a.type)
         WHEN a.sensitivity IS NULL OR a.sensitivity NOT IN ('PUBLIC', 'PRIVATE', 'CLASSIFIED') THEN format('unsupported sensitivity %s', a.sensitivity)
         WHEN a.language IS NULL OR a.language NOT IN ('ENGLISH', 'WELSH', 'BI_LINGUAL') THEN format('unsupported language %s', a.language)
         WHEN a.location_id IS NULL THEN 'missing location'
         -- NoMatch<id> marks a publication for a location legacy could not match; it is kept as-is.
         WHEN a.location_id NOT LIKE 'NoMatch%' AND NOT EXISTS (SELECT 1 FROM public.location l WHERE l.location_id::text = a.location_id)
           THEN format('unknown location %s', a.location_id)
         WHEN a.content_date IS NULL OR a.provenance IS NULL OR a.payload IS NULL THEN 'missing content date, provenance or payload'
       END AS reject_reason
  FROM legacy_publication.artefact a
 WHERE a.display_to IS NULL OR a.display_to > (now() AT TIME ZONE 'Europe/London');

CREATE TEMP TABLE m_artefact_search ON COMMIT DROP AS
SELECT s.id::text AS id, s.artefact_id, s.case_number, s.case_name, NULL::text AS reject_reason
  FROM legacy_publication.artefact_search s
 WHERE s.artefact_id IN (SELECT artefact_id FROM m_artefact WHERE reject_reason IS NULL);

-- Counts before the write, for the report.
CREATE TEMP TABLE cath_before ON COMMIT DROP AS
SELECT (SELECT count(*) FROM public."user" WHERE is_legacy_migrated) AS "user",
       (SELECT count(*) FROM public.subscription s JOIN public."user" u USING (user_id) WHERE u.is_legacy_migrated) AS subscription,
       (SELECT count(*) FROM public.subscription_list_type s JOIN public."user" u USING (user_id) WHERE u.is_legacy_migrated) AS subscription_list_type,
       (SELECT count(*) FROM public.legacy_third_party_user) AS legacy_third_party_user,
       (SELECT count(*) FROM public.legacy_third_party_subscription) AS legacy_third_party_subscription,
       (SELECT count(*) FROM public.third_party_user) AS third_party_user,
       (SELECT count(*) FROM public.third_party_subscription) AS third_party_subscription,
       (SELECT count(*) FROM public.media_application) AS media_application,
       (SELECT count(*) FROM public.audit_log) AS audit_log,
       (SELECT count(*) FROM public.user_archive) AS user_archive,
       (SELECT count(*) FROM public.location_metadata) AS location_metadata,
       (SELECT count(*) FROM public.list_search_config) AS list_search_config,
       (SELECT count(*) FROM public.artefact) AS artefact,
       (SELECT count(*) FROM public.artefact_search) AS artefact_search;

-- ---------------------------------------------------------------------------------------------
-- Write: delete children first, then insert parents first. DELETE rather than TRUNCATE, so the
-- running app keeps reading the old rows until commit.
-- ---------------------------------------------------------------------------------------------

-- Users created in this service (testers who signed in) are kept, unless their provenance id
-- matches a legacy user: user_provenance_id is unique, so the legacy row takes its place.
CREATE TEMP TABLE replaced_user ON COMMIT DROP AS
SELECT user_id FROM public."user"
 WHERE is_legacy_migrated
    OR user_provenance_id IN (SELECT user_provenance_id FROM m_user WHERE reject_reason IS NULL)
    OR user_id IN (SELECT user_id FROM m_user WHERE reject_reason IS NULL);

DELETE FROM public.subscription_list_type WHERE user_id IN (SELECT user_id FROM replaced_user);
-- Cascades to notification_audit_log.
DELETE FROM public.subscription WHERE user_id IN (SELECT user_id FROM replaced_user);
DELETE FROM public."user" WHERE user_id IN (SELECT user_id FROM replaced_user);
DELETE FROM public.legacy_third_party_subscription;
DELETE FROM public.legacy_third_party_user;
DELETE FROM public.third_party_subscription;
DELETE FROM public.third_party_user;
DELETE FROM public.media_application;
DELETE FROM public.audit_log;
DELETE FROM public.user_archive;
DELETE FROM public.location_metadata;
DELETE FROM public.list_search_config;
-- Cascades to artefact_search and nulls ingestion_log.artefact_id.
DELETE FROM public.artefact;

INSERT INTO public."user" (user_id, email, first_name, surname, user_provenance, user_provenance_id, role,
                           created_date, last_signed_in_date, last_verified_date, is_legacy_migrated)
SELECT user_id, email, first_name, surname, user_provenance, user_provenance_id, role,
       created_date, last_signed_in_date, last_verified_date, true
  FROM m_user WHERE reject_reason IS NULL;

INSERT INTO public.subscription (subscription_id, user_id, search_type, search_value, case_name, case_number, date_added)
SELECT subscription_id, user_id, search_type, search_value, case_name, case_number, date_added
  FROM m_subscription WHERE reject_reason IS NULL;

INSERT INTO public.subscription_list_type (subscription_list_type_id, user_id, list_type_ids, list_language)
SELECT subscription_list_type_id, user_id, list_type_ids, list_language
  FROM m_subscription_list_type WHERE reject_reason IS NULL;

INSERT INTO public.legacy_third_party_user (id, name, created_date)
SELECT id, name, created_date FROM m_legacy_third_party_user WHERE reject_reason IS NULL;

INSERT INTO public.legacy_third_party_subscription (id, user_id, list_type_id, created_date)
SELECT id, user_id, list_type_id, created_date FROM m_legacy_third_party_subscription WHERE reject_reason IS NULL;

INSERT INTO public.third_party_user (id, name, created_at)
SELECT id, name, created_at FROM m_third_party_user WHERE reject_reason IS NULL;

INSERT INTO public.third_party_subscription (id, third_party_user_id, list_type_id, sensitivity)
SELECT id, third_party_user_id, list_type_id, sensitivity FROM m_third_party_subscription WHERE reject_reason IS NULL;

INSERT INTO public.media_application (id, name, email, employer, proof_of_id_path, proof_of_id_original_name, status, applied_date)
SELECT id, name, email, employer, proof_of_id_path, proof_of_id_original_name, 'PENDING', applied_date
  FROM m_media_application WHERE reject_reason IS NULL;

INSERT INTO public.audit_log (id, "timestamp", action, details, user_id, user_email, user_role, user_provenance)
SELECT id, "timestamp", action, details, user_id, user_email, user_role, user_provenance
  FROM m_audit_log WHERE reject_reason IS NULL;

INSERT INTO public.user_archive (user_id, user_provenance, provenance_user_id, email, roles, last_signed_in_date, archived_date)
SELECT user_id, user_provenance, provenance_user_id, email, roles, last_signed_in_date, archived_date
  FROM m_user_archive WHERE reject_reason IS NULL;

INSERT INTO public.location_metadata (location_metadata_id, location_id, caution_message, welsh_caution_message,
                                      no_list_message, welsh_no_list_message, updated_at)
SELECT location_metadata_id, location_id, caution_message, welsh_caution_message, no_list_message, welsh_no_list_message, now()
  FROM m_location_metadata WHERE reject_reason IS NULL;

INSERT INTO public.list_search_config (id, list_type_id, case_number_field_name, case_name_field_name, updated_at)
SELECT id, list_type_id, case_number_field_name, case_name_field_name, now()
  FROM m_list_search_config WHERE reject_reason IS NULL;

INSERT INTO public.artefact (artefact_id, type, location_id, list_type_id, content_date, sensitivity, language, display_from,
                             display_to, last_received_date, is_flat_file, provenance, superseded_count, source_artefact_id)
SELECT artefact_id, type, location_id, list_type_id, content_date, sensitivity, language, display_from,
       display_to, last_received_date, is_flat_file, provenance, superseded_count, source_artefact_id
  FROM m_artefact WHERE reject_reason IS NULL;

INSERT INTO public.artefact_search (id, artefact_id, case_number, case_name)
SELECT id, artefact_id, case_number, case_name FROM m_artefact_search;

-- ---------------------------------------------------------------------------------------------
-- Baseline: the migrated tables as this run commits them. Rows that are in the baseline and in
-- pip are the migrated ones; cath-to-pip-migration.sql diffs the live tables against it.
-- ---------------------------------------------------------------------------------------------

DROP SCHEMA IF EXISTS legacy_migration_baseline CASCADE;
CREATE SCHEMA legacy_migration_baseline;
CREATE TABLE legacy_migration_baseline."user" AS TABLE public."user";
CREATE TABLE legacy_migration_baseline.subscription AS TABLE public.subscription;
CREATE TABLE legacy_migration_baseline.subscription_list_type AS TABLE public.subscription_list_type;
CREATE TABLE legacy_migration_baseline.legacy_third_party_user AS TABLE public.legacy_third_party_user;
CREATE TABLE legacy_migration_baseline.legacy_third_party_subscription AS TABLE public.legacy_third_party_subscription;
CREATE TABLE legacy_migration_baseline.third_party_user AS TABLE public.third_party_user;
CREATE TABLE legacy_migration_baseline.third_party_subscription AS TABLE public.third_party_subscription;
CREATE TABLE legacy_migration_baseline.media_application AS TABLE public.media_application;
CREATE TABLE legacy_migration_baseline.audit_log AS TABLE public.audit_log;
CREATE TABLE legacy_migration_baseline.user_archive AS TABLE public.user_archive;
CREATE TABLE legacy_migration_baseline.location_metadata AS TABLE public.location_metadata;
CREATE TABLE legacy_migration_baseline.list_search_config AS TABLE public.list_search_config;
CREATE TABLE legacy_migration_baseline.artefact AS TABLE public.artefact;
CREATE TABLE legacy_migration_baseline.artefact_search AS TABLE public.artefact_search;

-- ---------------------------------------------------------------------------------------------
-- Report
-- ---------------------------------------------------------------------------------------------

CREATE TEMP TABLE migration_rejection ON COMMIT DROP AS
          SELECT 'user' AS table_name, user_id::text AS legacy_id, reject_reason AS reason FROM m_user WHERE reject_reason IS NOT NULL
UNION ALL SELECT 'subscription', subscription_id::text, reject_reason FROM m_subscription WHERE reject_reason IS NOT NULL
UNION ALL SELECT 'subscription_list_type', subscription_list_type_id::text, reject_reason FROM m_subscription_list_type WHERE reject_reason IS NOT NULL
-- Reported for every row, loaded or not: the rest of the row's list types still load.
UNION ALL SELECT 'subscription_list_type', subscription_list_type_id::text, format('unknown list type %s dropped', name)
            FROM m_subscription_list_type, unnest(dropped_names) name
UNION ALL SELECT 'legacy_third_party_user', id::text, reject_reason FROM m_legacy_third_party_user WHERE reject_reason IS NOT NULL
UNION ALL SELECT 'legacy_third_party_subscription', id::text, reject_reason FROM m_legacy_third_party_subscription WHERE reject_reason IS NOT NULL
UNION ALL SELECT 'third_party_user', id::text, reject_reason FROM m_third_party_user WHERE reject_reason IS NOT NULL
UNION ALL SELECT 'third_party_subscription', id::text, reject_reason FROM m_third_party_subscription WHERE reject_reason IS NOT NULL
UNION ALL SELECT 'media_application', id::text, reject_reason FROM m_media_application WHERE reject_reason IS NOT NULL
UNION ALL SELECT 'audit_log', id, reject_reason FROM m_audit_log WHERE reject_reason IS NOT NULL
UNION ALL SELECT 'user_archive', user_id::text, reject_reason FROM m_user_archive WHERE reject_reason IS NOT NULL
UNION ALL SELECT 'location_metadata', location_metadata_id, reject_reason FROM m_location_metadata WHERE reject_reason IS NOT NULL
UNION ALL SELECT 'list_search_config', id, reject_reason FROM m_list_search_config WHERE reject_reason IS NOT NULL
UNION ALL SELECT 'artefact', artefact_id::text, reject_reason FROM m_artefact WHERE reject_reason IS NOT NULL;

\echo
\echo 'Rows per table: in scope in legacy, loaded, rejected, and in cath before the migration'
SELECT t.table_name, t.legacy, t.loaded, t.legacy - t.loaded AS rejected, t.cath_before
  FROM (
              SELECT 1 AS n, 'user' AS table_name, (SELECT count(*) FROM m_user) AS legacy,
                     (SELECT count(*) FROM m_user WHERE reject_reason IS NULL) AS loaded,
                     (SELECT "user" FROM cath_before) AS cath_before
    UNION ALL SELECT 2, 'subscription', (SELECT count(*) FROM m_subscription),
                     (SELECT count(*) FROM m_subscription WHERE reject_reason IS NULL),
                     (SELECT subscription FROM cath_before)
    UNION ALL SELECT 3, 'subscription_list_type', (SELECT count(*) FROM m_subscription_list_type),
                     (SELECT count(*) FROM m_subscription_list_type WHERE reject_reason IS NULL),
                     (SELECT subscription_list_type FROM cath_before)
    UNION ALL SELECT 4, 'legacy_third_party_user', (SELECT count(*) FROM m_legacy_third_party_user),
                     (SELECT count(*) FROM m_legacy_third_party_user WHERE reject_reason IS NULL),
                     (SELECT legacy_third_party_user FROM cath_before)
    UNION ALL SELECT 5, 'legacy_third_party_subscription', (SELECT count(*) FROM m_legacy_third_party_subscription),
                     (SELECT count(*) FROM m_legacy_third_party_subscription WHERE reject_reason IS NULL),
                     (SELECT legacy_third_party_subscription FROM cath_before)
    UNION ALL SELECT 6, 'third_party_user', (SELECT count(*) FROM m_third_party_user),
                     (SELECT count(*) FROM m_third_party_user WHERE reject_reason IS NULL),
                     (SELECT third_party_user FROM cath_before)
    UNION ALL SELECT 7, 'third_party_subscription', (SELECT count(*) FROM m_third_party_subscription),
                     (SELECT count(*) FROM m_third_party_subscription WHERE reject_reason IS NULL),
                     (SELECT third_party_subscription FROM cath_before)
    UNION ALL SELECT 8, 'media_application', (SELECT count(*) FROM m_media_application),
                     (SELECT count(*) FROM m_media_application WHERE reject_reason IS NULL),
                     (SELECT media_application FROM cath_before)
    UNION ALL SELECT 9, 'audit_log', (SELECT count(*) FROM m_audit_log),
                     (SELECT count(*) FROM m_audit_log WHERE reject_reason IS NULL),
                     (SELECT audit_log FROM cath_before)
    UNION ALL SELECT 10, 'user_archive', (SELECT count(*) FROM m_user_archive),
                     (SELECT count(*) FROM m_user_archive WHERE reject_reason IS NULL),
                     (SELECT user_archive FROM cath_before)
    UNION ALL SELECT 11, 'location_metadata', (SELECT count(*) FROM m_location_metadata),
                     (SELECT count(*) FROM m_location_metadata WHERE reject_reason IS NULL),
                     (SELECT location_metadata FROM cath_before)
    UNION ALL SELECT 12, 'list_search_config', (SELECT count(*) FROM m_list_search_config),
                     (SELECT count(*) FROM m_list_search_config WHERE reject_reason IS NULL),
                     (SELECT list_search_config FROM cath_before)
    UNION ALL SELECT 13, 'artefact', (SELECT count(*) FROM m_artefact),
                     (SELECT count(*) FROM m_artefact WHERE reject_reason IS NULL),
                     (SELECT artefact FROM cath_before)
    UNION ALL SELECT 14, 'artefact_search', (SELECT count(*) FROM m_artefact_search),
                     (SELECT count(*) FROM m_artefact_search),
                     (SELECT artefact_search FROM cath_before)
  ) t
 ORDER BY t.n;

\echo 'Rejections by reason, with up to five legacy ids each'
SELECT table_name, reason, count(*) AS rows, array_to_string((array_agg(legacy_id ORDER BY legacy_id))[1:5], ', ') AS example_ids
  FROM migration_rejection
 GROUP BY table_name, reason
 ORDER BY table_name, count(*) DESC, reason;

\if :{?apply}
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

SELECT '#!/usr/bin/env bash';

-- Values go through a private temp file, not --value, so they never appear in the process list.
SELECT $script$
set_secret() { # <vault> <name> <value>
  local file
  file=$(mktemp) || { echo "FAILED: could not write $2 to $1" >&2; return; }
  if ! { printf %s "$3" > "$file" && az keyvault secret set --vault-name "$1" --name "$2" --file "$file" --output none; }; then
    echo "FAILED: could not write $2 to $1" >&2
  fi
  rm -f "$file"
}

copy_secret() { # <legacy vault> <legacy name> <vault> <name>
  local value
  if ! value=$(az keyvault secret show --vault-name "$1" --name "$2" --query value -o tsv) || [ -z "$value" ]; then
    echo "FAILED: could not read $2 from $1, so $4 was not written" >&2
    return
  fi
  set_secret "$3" "$4" "$value"
}
$script$;

-- Legacy names payload blobs randomly; this service reads artefact/<artefactId>.
SELECT format('azcopy copy %s %s',
              pg_temp.shell_quote(format('https://%s.blob.core.windows.net/artefact/%s', :'legacy_storage', regexp_replace(l.payload, '^.*/', ''))),
              pg_temp.shell_quote(format('https://%s.blob.core.windows.net/artefact/%s', :'cath_storage', a.artefact_id)))
  FROM public.artefact a
  JOIN legacy_publication.artefact l USING (artefact_id)
 ORDER BY a.artefact_id;

-- Same names in both, and only for migrated artefacts. <id>_cy.pdf is left out because nothing
-- here serves it. Names that don't exist are skipped by azcopy, so an artefact with no
-- spreadsheet is fine. Batches keep each pattern under the 128KB limit on one argument.
SELECT format('azcopy copy %s %s --include-pattern %s',
              pg_temp.shell_quote(format('https://%s.blob.core.windows.net/publications/*', :'legacy_storage')),
              pg_temp.shell_quote(format('https://%s.blob.core.windows.net/publications/', :'cath_storage')),
              pg_temp.shell_quote(string_agg(format('%s.pdf;%s.xlsx', artefact_id, artefact_id), ';' ORDER BY artefact_id)))
  FROM (SELECT a.artefact_id, (row_number() OVER (ORDER BY a.artefact_id) - 1) / 1000 AS batch
          FROM public.artefact a
          JOIN legacy_publication.artefact l USING (artefact_id)) migrated
 GROUP BY batch
 ORDER BY batch;

SELECT format('azcopy copy %s %s',
              pg_temp.shell_quote(format('https://%s.blob.core.windows.net/files/%s', :'legacy_storage', l.image)),
              pg_temp.shell_quote(format('https://%s.blob.core.windows.net/files/%s', :'cath_storage', m.proof_of_id_path)))
  FROM public.media_application m
  JOIN legacy_account.media_application l USING (id)
 ORDER BY m.id;

-- Secret names come from the legacy row and values from the legacy vault. A subscriber with
-- several configurations gets the newest.
\if :{?legacy_vault}
WITH configuration AS (
  SELECT DISTINCT ON (c.user_id) c.*
    FROM legacy_account.api_oauth_configuration c
    JOIN public.third_party_user u ON u.id = c.user_id
   WHERE c.destination_url IS NOT NULL AND c.token_url IS NOT NULL
     AND c.client_id_key IS NOT NULL AND c.client_secret_key IS NOT NULL AND c.scope_key IS NOT NULL
   ORDER BY c.user_id, c.created_date DESC, c.id DESC
), secret AS (
            SELECT user_id, 'destination-url' AS type, format('set_secret %s %s %s', pg_temp.shell_quote(:'cath_vault'),
                     pg_temp.shell_quote(format('third-party-%s-destination-url', user_id)), pg_temp.shell_quote(destination_url)) AS command
              FROM configuration
  UNION ALL SELECT user_id, 'token-url', format('set_secret %s %s %s', pg_temp.shell_quote(:'cath_vault'),
                     pg_temp.shell_quote(format('third-party-%s-token-url', user_id)), pg_temp.shell_quote(token_url))
              FROM configuration
  UNION ALL SELECT user_id, type, format('copy_secret %s %s %s %s', pg_temp.shell_quote(:'legacy_vault'), pg_temp.shell_quote(legacy_name),
                     pg_temp.shell_quote(:'cath_vault'), pg_temp.shell_quote(format('third-party-%s-%s', user_id, type)))
              FROM configuration,
                   LATERAL (VALUES ('client-id', client_id_key), ('client-secret', client_secret_key), ('scope', scope_key)) k (type, legacy_name)
)
SELECT command FROM secret ORDER BY user_id, type;
\else
SELECT '# OAuth secrets skipped: rerun with -v legacy_vault=<legacy OAuth vault> to include them.';
\endif
\o
\pset format aligned
\pset tuples_only off
\set QUIET off

DROP SERVER legacy_account CASCADE;
DROP SERVER legacy_publication CASCADE;
DROP SCHEMA legacy_account;
DROP SCHEMA legacy_publication;
COMMIT;
\echo 'Applied. Copy the files and secrets next: bash' :files_script
\else
ROLLBACK;
\echo 'Dry run: nothing was written. Run with -v apply=1 to apply.'
\endif
