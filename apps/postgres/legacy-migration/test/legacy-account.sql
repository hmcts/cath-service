-- Legacy accountmanagement tables as in production (Flyway V1.22, plus the columns Hibernate
-- created before Flyway), with rows for run.sh.

CREATE TABLE pi_user (
  user_id uuid PRIMARY KEY, email varchar(255), provenance_user_id varchar(255) NOT NULL, roles varchar(255),
  user_provenance varchar(255), created_date timestamp, last_verified_date timestamp, forenames varchar(255),
  surname varchar(255), last_signed_in_date timestamp
);
CREATE TABLE subscription (
  id uuid PRIMARY KEY, case_name varchar(255), case_number varchar(255), channel varchar(255), court_name varchar(255),
  created_date timestamp, location_name varchar(255), search_type varchar(255), search_value varchar(255), urn varchar(255),
  user_id uuid NOT NULL REFERENCES pi_user (user_id), list_type text[], last_updated_date timestamp, party_names varchar(255),
  CONSTRAINT subscription_search_type_check CHECK (search_type IN ('LOCATION_ID', 'CASE_ID', 'CASE_URN', 'LIST_TYPE', 'CASE_NUMBER', 'CASE_NAME'))
);
CREATE TABLE subscription_list_type (
  id uuid PRIMARY KEY, list_language text[], list_type text[], user_id uuid NOT NULL REFERENCES pi_user (user_id)
);
CREATE TABLE media_application (
  id uuid PRIMARY KEY, email varchar(255), employer varchar(255), full_name varchar(255), image varchar(255),
  image_name varchar(255), request_date timestamp, status varchar(255), status_date timestamp
);
CREATE TABLE audit_log (
  id uuid PRIMARY KEY, action varchar(255), details varchar(255), "timestamp" timestamp, user_email varchar(255),
  user_id varchar(255), roles varchar(255), user_provenance varchar(255)
);
CREATE TABLE pi_user_archived (
  user_id uuid PRIMARY KEY, user_provenance varchar(255), provenance_user_id varchar(255), email varchar(255),
  roles varchar(255), last_signed_in_date timestamp, archived_date timestamp
);
CREATE TABLE api_user (
  user_id uuid PRIMARY KEY, name text CONSTRAINT unique_name_constraint UNIQUE, created_date timestamp,
  status varchar(20) NOT NULL DEFAULT 'PENDING'
);
CREATE TABLE api_subscription (
  id uuid PRIMARY KEY, user_id uuid REFERENCES api_user (user_id), list_type text, sensitivity text,
  created_date timestamp, last_updated_date timestamp
);
CREATE TABLE api_oauth_configuration (
  id uuid PRIMARY KEY, user_id uuid REFERENCES api_user (user_id), destination_url text, token_url text,
  client_id_key text, client_secret_key text, scope_key text, created_date timestamp, last_updated_date timestamp
);

INSERT INTO pi_user (user_id, email, forenames, surname, user_provenance, provenance_user_id, roles, created_date) VALUES
 ('11111111-0000-0000-0000-000000000001', ' Media@Example.com ', 'Mia', 'Media', 'PI_AAD', 'oid-1', 'VERIFIED', '2025-01-01'),
 ('11111111-0000-0000-0000-000000000002', 'admin@example.com', 'Ada', 'Admin', 'SSO', 'sso-2', 'INTERNAL_SUPER_ADMIN_CTSC', '2025-01-02'),
 ('11111111-0000-0000-0000-000000000003', 'crime@example.com', 'Cy', 'Crime', 'CRIME_IDAM', 'sub-3', 'VERIFIED', '2025-01-03'),
 ('11111111-0000-0000-0000-000000000004', 'courtel', NULL, NULL, 'THIRD_PARTY', 'Courtel', 'VERIFIED_THIRD_PARTY_ALL', '2025-01-04'),
 -- Rejected by the migration (unmapped role), so cath creates a new account if they sign in there.
 ('11111111-0000-0000-0000-000000000005', 'gtp@example.com', 'Gee', 'Tp', 'PI_AAD', 'oid-5', 'GENERAL_THIRD_PARTY', '2025-01-05');
INSERT INTO pi_user_archived VALUES ('11111111-0000-0000-0000-0000000000a1', 'PI_AAD', 'oid-a', 'gone@example.com', 'VERIFIED', NULL, '2026-10-01');
INSERT INTO subscription (id, user_id, search_type, search_value, case_name, created_date, channel) VALUES
 ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'LOCATION_ID', '1', NULL, '2025-02-01', 'EMAIL'),
 ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'CASE_ID', 'C1', 'Case one', '2025-02-02', 'EMAIL'),
 ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'CASE_URN', 'C1', 'Case one', '2025-02-03', 'EMAIL'),
 ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000004', 'LIST_TYPE', 'CIVIL_DAILY_CAUSE_LIST', NULL, '2025-02-04', 'API_COURTEL'),
 ('22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000003', 'CASE_NAME', 'Smith', 'Smith', '2025-02-05', 'EMAIL');
INSERT INTO subscription_list_type VALUES ('33333333-0000-0000-0000-000000000001', ARRAY['ENGLISH'],
  ARRAY['CIVIL_DAILY_CAUSE_LIST', 'SSCS_DAILY_LIST'], '11111111-0000-0000-0000-000000000001');
INSERT INTO media_application VALUES
 ('44444444-0000-0000-0000-000000000001', 'Pat@Press.com', 'Press Ltd', 'Pat Press', 'blob-xyz', 'ID.JPG', '2026-09-01', 'PENDING', '2026-09-01');
INSERT INTO audit_log VALUES ('55555555-0000-0000-0000-000000000001', 'MANAGE_USER', 'd', now() - interval '1 day', 'admin@example.com', 'u', 'SYSTEM_ADMIN', 'SSO');
INSERT INTO api_user VALUES ('66666666-0000-0000-0000-000000000001', 'Sub', '2025-01-01', 'ACTIVE');
INSERT INTO api_subscription (id, user_id, list_type, sensitivity) VALUES
 ('77777777-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000001', 'CIVIL_DAILY_CAUSE_LIST', 'CLASSIFIED'),
 ('77777777-0000-0000-0000-000000000002', '66666666-0000-0000-0000-000000000001', 'CIVIL_DAILY_CAUSE_LIST', 'PUBLIC');
INSERT INTO api_oauth_configuration (id, user_id, destination_url, token_url, client_id_key, client_secret_key, scope_key, created_date) VALUES
 ('88888888-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000001', 'https://dest.example/it''s', 'https://token.example',
  'cid-key', 'csecret-key', 'scope-key', '2025-01-01');
