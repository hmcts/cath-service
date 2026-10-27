-- Legacy datamanagement tables as in production (Flyway V1.26, plus the columns Hibernate
-- created before Flyway), with rows for run.sh. Times are London wall-clock time.

CREATE TABLE location (location_id integer PRIMARY KEY, name varchar(255));
CREATE TABLE artefact (
  artefact_id uuid PRIMARY KEY, content_date timestamp, display_from timestamp, display_to timestamp, is_flat_file boolean,
  language varchar(255), list_type varchar(255), location_id varchar(255), payload varchar(255), provenance varchar(255),
  search json, sensitivity varchar(255), source_artefact_id varchar(255), type varchar(255), last_received_date timestamp,
  superseded_count integer, payload_size numeric(10, 2),
  CONSTRAINT unique_publication_index UNIQUE (location_id, content_date, language, list_type, provenance)
);
CREATE TABLE artefact_search (
  id uuid PRIMARY KEY, artefact_id uuid NOT NULL REFERENCES artefact (artefact_id) ON DELETE CASCADE,
  case_number varchar(255), case_name varchar(255)
);
CREATE TABLE location_metadata (
  location_metadata_id uuid PRIMARY KEY, location_id integer CONSTRAINT unique_location_id_constraint UNIQUE REFERENCES location (location_id),
  caution_message text, welsh_caution_message text, no_list_message text, welsh_no_list_message text
);
CREATE TABLE list_search_config (
  id uuid PRIMARY KEY, list_type varchar(255) CONSTRAINT unique_list_type_constraint UNIQUE,
  case_number_field_name varchar(255), case_name_field_name varchar(255)
);

INSERT INTO location VALUES (1, 'Test Court'), (2, 'Other Court');
INSERT INTO location_metadata VALUES ('99999999-0000-0000-0000-000000000001', 1, ' Caution ', '', NULL, NULL);
INSERT INTO list_search_config VALUES ('99999999-0000-0000-0000-000000000002', 'CIVIL_DAILY_CAUSE_LIST', 'caseNumber', NULL);
INSERT INTO artefact (artefact_id, type, location_id, list_type, content_date, sensitivity, language, display_from, display_to,
                      last_received_date, is_flat_file, provenance, superseded_count, payload, search) VALUES
 -- display_from is BST: 12:00 in London is 11:00 UTC.
 ('aaaaaaaa-0000-0000-0000-000000000001', 'LIST', '1', 'CIVIL_DAILY_CAUSE_LIST', '2026-10-27 00:00', 'PUBLIC', 'BI_LINGUAL',
  '2026-07-01 12:00', NULL, '2026-10-26 09:00', false, 'MANUAL_UPLOAD', 0, 'https://legacysa.blob.core.windows.net/artefact/rand-1', '{}'),
 ('aaaaaaaa-0000-0000-0000-000000000002', 'LIST', '1', 'CIVIL_DAILY_CAUSE_LIST', '2026-10-27 00:00', 'INTERNAL', 'ENGLISH',
  '2026-10-26', NULL, '2026-10-26', false, 'MANUAL_UPLOAD', 0, 'https://legacysa.blob.core.windows.net/artefact/rand-2', '{}'),
 -- Same name in both since #1077, and a name that still goes through the rename table.
 ('aaaaaaaa-0000-0000-0000-000000000003', 'LIST', '1', 'CST_WEEKLY_HEARING_LIST', '2026-10-27 00:00', 'PUBLIC', 'ENGLISH',
  '2026-10-26', NULL, '2026-10-26', false, 'MANUAL_UPLOAD', 0, 'https://legacysa.blob.core.windows.net/artefact/rand-3', '{}'),
 ('aaaaaaaa-0000-0000-0000-000000000004', 'LIST', '1', 'INTERIM_APPLICATIONS_CHD_DAILY_CAUSE_LIST', '2026-10-27 00:00', 'PUBLIC', 'ENGLISH',
  '2026-10-26', NULL, '2026-10-26', false, 'MANUAL_UPLOAD', 0, 'https://legacysa.blob.core.windows.net/artefact/rand-4', '{}');
INSERT INTO artefact_search VALUES ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'C1', 'Case one');
