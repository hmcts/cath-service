-- Reference data and pre-existing cath rows for run.sh, loaded after the Prisma migrations.
INSERT INTO location (location_id, name, welsh_name) VALUES (1, 'Test Court', 'Llys Prawf'), (2, 'Other Court', 'Llys Arall');
-- CATH_ONLY_LIST has no legacy equivalent, so cath-to-pip-migration.sql can't write it back.
INSERT INTO list_types (name, allowed_provenance, updated_at)
VALUES ('CIVIL_DAILY_CAUSE_LIST', '{}', now()), ('FAMILY_DAILY_CAUSE_LIST', '{}', now()), ('CATH_ONLY_LIST', '{}', now()),
       ('CST_WEEKLY_HEARING_LIST', '{}', now()), ('INTERIM_APPLICATIONS_DAILY_CAUSE_LIST', '{}', now());
-- A local tester who is kept, and one whose provenance id matches legacy and is replaced.
INSERT INTO "user" (user_id, email, user_provenance, user_provenance_id, role)
VALUES ('cccccccc-0000-0000-0000-000000000001', 'tester@example.com', 'SSO', 'local-tester', 'SYSTEM_ADMIN'),
       ('cccccccc-0000-0000-0000-000000000002', 'media@example.com', 'PI_AAD', 'oid-1', 'VERIFIED');
INSERT INTO artefact (artefact_id, location_id, list_type_id, content_date, sensitivity, language, display_from, display_to, last_received_date, provenance, type, is_flat_file)
SELECT 'dddddddd-0000-0000-0000-000000000001', '1', id, '2026-10-01', 'PUBLIC', 'ENGLISH', '2026-10-01', '2026-11-01', now(), 'MANUAL_UPLOAD', 'LIST', false
  FROM list_types WHERE name = 'CIVIL_DAILY_CAUSE_LIST';
