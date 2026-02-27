-- Seed test artefacts for locationId 9 (used in E2E tests)
-- Using fixed UUIDs so they're consistent across runs

INSERT INTO artefact (artefact_id, location_id, list_type_id, content_date, sensitivity, language, display_from, display_to, last_received_date, provenance, is_flat_file, superseded_count, no_match)
VALUES
  ('11111111-1111-1111-1111-111111111111', '9', 6, '2025-01-15', 'PUBLIC', 'ENGLISH', '2025-01-01', '2026-01-01', '2025-01-15T10:00:00Z', 'MANUAL_UPLOAD', false, 0, false),
  ('22222222-2222-2222-2222-222222222222', '9', 1, '2025-01-16', 'PUBLIC', 'ENGLISH', '2025-01-01', '2026-01-01', '2025-01-16T10:00:00Z', 'MANUAL_UPLOAD', true, 0, false),
  ('33333333-3333-3333-3333-333333333333', '9', 2, '2025-01-17', 'PUBLIC', 'ENGLISH', '2025-01-01', '2026-01-01', '2025-01-17T10:00:00Z', 'MANUAL_UPLOAD', true, 0, false)
ON CONFLICT (artefact_id) DO NOTHING;
