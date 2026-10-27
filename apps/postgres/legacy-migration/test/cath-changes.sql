-- What cath does after the migration is applied, for run.sh to copy back with cath-to-pip-migration.sql.

-- The media user signs in, drops their case subscription (which legacy holds as CASE_ID and
-- CASE_URN), subscribes to another court and adds two list types, one cath-only.
UPDATE "user" SET last_signed_in_date = '2026-10-27 09:00' WHERE user_id = '11111111-0000-0000-0000-000000000001';
DELETE FROM subscription WHERE subscription_id = '22222222-0000-0000-0000-000000000002';
INSERT INTO subscription (subscription_id, user_id, search_type, search_value, date_added)
VALUES ('eeeeeeee-0000-0000-0000-000000000011', '11111111-0000-0000-0000-000000000001', 'LOCATION_ID', '2', '2026-10-27 09:01');
UPDATE subscription_list_type
   SET list_type_ids = (SELECT array_agg(id ORDER BY id) FROM list_types)
 WHERE user_id = '11111111-0000-0000-0000-000000000001';

-- The super admin, migrated as INTERNAL_ADMIN_CTSC, signs in. Legacy must keep the super role.
UPDATE "user" SET last_signed_in_date = '2026-10-27 09:05' WHERE user_id = '11111111-0000-0000-0000-000000000002';

-- The Crime user deletes their account.
DELETE FROM "user" WHERE user_id = '11111111-0000-0000-0000-000000000003';

-- A new user signs up and subscribes. A user the migration rejected signs in and gets a second
-- account, which legacy must not take. The kept local tester subscribes.
INSERT INTO "user" (user_id, email, first_name, user_provenance, user_provenance_id, role, created_date)
VALUES ('eeeeeeee-0000-0000-0000-000000000001', 'new@example.com', 'Nia', 'CFT_IDAM', 'cft-new', 'VERIFIED', '2026-10-27 09:10'),
       ('eeeeeeee-0000-0000-0000-000000000002', 'gtp@example.com', 'Gee', 'PI_AAD', 'oid-5', 'VERIFIED', '2026-10-27 09:11');
INSERT INTO subscription (subscription_id, user_id, search_type, search_value, case_name, date_added)
VALUES ('eeeeeeee-0000-0000-0000-000000000012', 'eeeeeeee-0000-0000-0000-000000000001', 'CASE_NAME', 'Jones', 'Jones', '2026-10-27 09:12'),
       ('eeeeeeee-0000-0000-0000-000000000013', 'cccccccc-0000-0000-0000-000000000001', 'LOCATION_ID', '1', NULL, '2026-10-27 09:13');

-- A media application is approved and a new one arrives.
UPDATE media_application SET status = 'APPROVED' WHERE id = '44444444-0000-0000-0000-000000000001';
INSERT INTO media_application (id, name, email, employer, proof_of_id_path, proof_of_id_original_name, status, applied_date)
VALUES ('eeeeeeee-0000-0000-0000-000000000003', 'Rae Reporter', 'rae@news.com', 'News', 'eeeeeeee-0000-0000-0000-000000000003.pdf', 'id.pdf', 'PENDING', '2026-10-27 09:20');

-- Two audit entries; legacy has no USER_LOGIN action.
INSERT INTO audit_log (id, "timestamp", action, details, user_id, user_email, user_role, user_provenance)
VALUES ('ckaudit000000000000000001', '2026-10-27 09:30', 'MANAGE_USER', 'd', 'u', 'admin@example.com', 'SYSTEM_ADMIN', 'SSO'),
       ('ckaudit000000000000000002', '2026-10-27 09:31', 'USER_LOGIN', 'd', 'u', 'admin@example.com', 'SYSTEM_ADMIN', 'SSO');

-- A migrated list gets a new display end. A new list arrives (published in BST), with a case
-- search row, and another on a list type legacy doesn't have.
UPDATE artefact SET display_to = '2026-12-01 10:00' WHERE artefact_id = 'aaaaaaaa-0000-0000-0000-000000000001';
INSERT INTO artefact (artefact_id, type, location_id, list_type_id, content_date, sensitivity, language, display_from,
                      last_received_date, is_flat_file, provenance)
SELECT 'eeeeeeee-0000-0000-0000-000000000004', 'LIST', '2', id, '2026-10-28', 'PUBLIC', 'BILINGUAL', '2026-08-01 10:00',
       '2026-10-27 09:40', false, 'MANUAL_UPLOAD' FROM list_types WHERE name = 'FAMILY_DAILY_CAUSE_LIST';
INSERT INTO artefact (artefact_id, type, location_id, list_type_id, content_date, sensitivity, language, display_from,
                      last_received_date, is_flat_file, provenance)
SELECT 'eeeeeeee-0000-0000-0000-000000000005', 'LIST', '2', id, '2026-10-28', 'PUBLIC', 'ENGLISH', '2026-10-27 09:00',
       '2026-10-27 09:41', false, 'MANUAL_UPLOAD' FROM list_types WHERE name = 'CATH_ONLY_LIST';
INSERT INTO artefact (artefact_id, type, location_id, list_type_id, content_date, sensitivity, language, display_from,
                      last_received_date, is_flat_file, provenance)
SELECT 'eeeeeeee-0000-0000-0000-000000000009', 'LIST', '2', id, '2026-10-28', 'PUBLIC', 'ENGLISH', '2026-10-27 09:00',
       '2026-10-27 09:42', false, 'MANUAL_UPLOAD' FROM list_types WHERE name = 'INTERIM_APPLICATIONS_DAILY_CAUSE_LIST';
INSERT INTO artefact_search (id, artefact_id, case_number, case_name)
VALUES ('eeeeeeee-0000-0000-0000-000000000006', 'eeeeeeee-0000-0000-0000-000000000004', 'F1', 'Family one');

-- Court messages change, and a new third party subscribes.
UPDATE location_metadata SET caution_message = 'New caution', updated_at = now() WHERE location_id = 1;
INSERT INTO third_party_user (id, name, created_at) VALUES ('eeeeeeee-0000-0000-0000-000000000007', 'NewSub', '2026-10-27 09:50');
INSERT INTO third_party_subscription (id, third_party_user_id, list_type_id, sensitivity)
SELECT 'eeeeeeee-0000-0000-0000-000000000008', 'eeeeeeee-0000-0000-0000-000000000007', id, 'PUBLIC' FROM list_types WHERE name = 'FAMILY_DAILY_CAUSE_LIST';
