-- Rename the three Crown list types to the names used by the CaTH Inbound Publication API's
-- x-list-type enum, so publishers built against pip-data-management need no change.
--
-- Renamed in place rather than reseeded: list_type_id is an autoincrement primary key referenced
-- by artefact.list_type_id and list_types_sub_jurisdictions.list_type_id. Inserting new rows and
-- letting the deploy seed soft-delete the old ones would orphan every existing artefact, so the
-- id must be preserved.
--
-- Runs before the generated seed SQL (apps/postgres/start.sh does migrate deploy first), so the
-- seed's ON CONFLICT (name) then matches these rows and the soft-delete reconciliation finds
-- nothing stale.
--
-- Guarded on the new name not already existing, because name is UNIQUE.

UPDATE "list_types" SET "name" = 'CROWN_DAILY_PDDA_LIST', "updated_at" = NOW()
WHERE "name" = 'CROWN_DAILY_LIST'
  AND NOT EXISTS (SELECT 1 FROM "list_types" WHERE "name" = 'CROWN_DAILY_PDDA_LIST');

UPDATE "list_types" SET "name" = 'CROWN_FIRM_PDDA_LIST', "updated_at" = NOW()
WHERE "name" = 'CROWN_FIRM_LIST'
  AND NOT EXISTS (SELECT 1 FROM "list_types" WHERE "name" = 'CROWN_FIRM_PDDA_LIST');

UPDATE "list_types" SET "name" = 'CROWN_WARNED_PDDA_LIST', "updated_at" = NOW()
WHERE "name" = 'CROWN_WARNED_LIST'
  AND NOT EXISTS (SELECT 1 FROM "list_types" WHERE "name" = 'CROWN_WARNED_PDDA_LIST');
