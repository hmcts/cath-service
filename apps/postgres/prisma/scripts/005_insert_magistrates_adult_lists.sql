-- Add the magistrates adult court list types (daily/future, public/non-public).
-- These exist in libs/list-types/common/src/list-type-data.ts (local/STG seed)
-- but were missing from the production reference-data scripts.
-- Idempotent: safe to re-run at any time.
-- Sub-jurisdiction 7 (Magistrates Court) already exists (see script 003).

-- Step 1: Upsert the list types (same shape as script 001)
INSERT INTO list_types (name, friendly_name, welsh_friendly_name, shortened_friendly_name, url, default_sensitivity, allowed_provenance, is_non_strategic, updated_at)
VALUES
  ('MAGISTRATES_ADULT_COURT_LIST_DAILY', 'Magistrates Adult Court List - Daily', 'Rhestr Llys Ynadon Oedolion - Dyddiol', 'Magistrates Adult Court List - Daily', 'magistrates-adult-court-list', 'Classified', 'CRIME_IDAM', false, NOW()),
  ('MAGISTRATES_ADULT_COURT_LIST_FUTURE', 'Magistrates Adult Court List - Future', 'Rhestr Llys Ynadon Oedolion – Dyfodol', 'Magistrates Adult Court List - Future', 'magistrates-adult-court-list', 'Classified', 'CRIME_IDAM', false, NOW()),
  ('MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY', 'Magistrates Public Adult Court List - Daily', 'Rhestr Achosion Cyhoeddus Llys Ynadon (Oedolion) - Dyddiol', 'Magistrates Public Adult Court List - Daily', 'magistrates-public-adult-court-list', 'Public', 'CRIME_IDAM', false, NOW()),
  ('MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE', 'Magistrates Public Adult Court List - Future', 'Rhestr Achosion Cyhoeddus Llys Ynadon (Oedolion) - Dyfodol', 'Magistrates Public Adult Court List - Future', 'magistrates-public-adult-court-list', 'Public', 'CRIME_IDAM', false, NOW())
ON CONFLICT (name) DO UPDATE SET
  friendly_name           = EXCLUDED.friendly_name,
  welsh_friendly_name     = EXCLUDED.welsh_friendly_name,
  shortened_friendly_name = EXCLUDED.shortened_friendly_name,
  url                     = EXCLUDED.url,
  default_sensitivity     = EXCLUDED.default_sensitivity,
  allowed_provenance      = EXCLUDED.allowed_provenance,
  is_non_strategic        = EXCLUDED.is_non_strategic,
  updated_at              = EXCLUDED.updated_at;

-- Step 2: Link each list type to Magistrates Court (7)
INSERT INTO list_types_sub_jurisdictions (list_type_id, sub_jurisdiction_id)
SELECT lt.id, sj.sub_jurisdiction_id
FROM (VALUES
  -- MAGISTRATES_ADULT_COURT_LIST_DAILY → Magistrates Court (7)
  ('MAGISTRATES_ADULT_COURT_LIST_DAILY',         7),
  -- MAGISTRATES_ADULT_COURT_LIST_FUTURE → Magistrates Court (7)
  ('MAGISTRATES_ADULT_COURT_LIST_FUTURE',        7),
  -- MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY → Magistrates Court (7)
  ('MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY',  7),
  -- MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE → Magistrates Court (7)
  ('MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE', 7)
) AS mapping(list_type_name, sub_jurisdiction_id)
JOIN list_types lt ON lt.name = mapping.list_type_name
JOIN sub_jurisdiction sj ON sj.sub_jurisdiction_id = mapping.sub_jurisdiction_id
ON CONFLICT (list_type_id, sub_jurisdiction_id) DO NOTHING;
