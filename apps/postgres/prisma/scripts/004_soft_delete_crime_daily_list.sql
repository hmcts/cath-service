-- Soft-delete CRIME_DAILY_LIST which was removed from the pip-data-models enum.
-- Idempotent: safe to re-run (only updates rows where deleted_at is NULL).

UPDATE list_types
SET deleted_at = NOW()
WHERE name = 'CRIME_DAILY_LIST'
  AND deleted_at IS NULL;
