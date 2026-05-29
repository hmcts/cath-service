-- Seed list types required for artefacts (FK constraint requirement)
-- Use ON CONFLICT to handle cases where test-support routes already created them
INSERT INTO list_types (id, name, friendly_name, allowed_provenance, updated_at)
VALUES
  (1, 'TEST_LIST_TYPE_1', 'Test List Type 1', 'MANUAL_UPLOAD', NOW()),
  (2, 'TEST_LIST_TYPE_2', 'Test List Type 2', 'MANUAL_UPLOAD', NOW()),
  (6, 'TEST_LIST_TYPE_6', 'Test List Type 6', 'MANUAL_UPLOAD', NOW())
ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

-- Reset the sequence so new inserts don't conflict with manual IDs
SELECT setval('list_types_id_seq', (SELECT MAX(id) FROM list_types));

-- Seed test artefacts for locationId 9 (used in E2E tests)
-- Using fixed UUIDs so they're consistent across runs

INSERT INTO artefact (artefact_id, type, location_id, list_type_id, content_date, sensitivity, language, display_from, display_to, last_received_date, provenance, is_flat_file, superseded_count, no_match)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'LIST', '9', 6, '2025-01-15', 'PUBLIC', 'ENGLISH', '2025-01-01', '2026-01-01', '2025-01-15T10:00:00Z', 'MANUAL_UPLOAD', false, 0, false),
  ('22222222-2222-2222-2222-222222222222', 'LIST', '9', 1, '2025-01-16', 'PUBLIC', 'ENGLISH', '2025-01-01', '2026-01-01', '2025-01-16T10:00:00Z', 'MANUAL_UPLOAD', true, 0, false),
  ('33333333-3333-3333-3333-333333333333', 'LIST', '9', 2, '2025-01-17', 'PUBLIC', 'ENGLISH', '2025-01-01', '2026-01-01', '2025-01-17T10:00:00Z', 'MANUAL_UPLOAD', true, 0, false)
ON CONFLICT (artefact_id) DO NOTHING;
