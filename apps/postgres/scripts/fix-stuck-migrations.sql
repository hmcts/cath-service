-- Resolve migrations stuck in a partial state (started but not finished).
-- This happens when a pod is killed mid-migration; prisma migrate deploy
-- will re-run them on the next start.
UPDATE _prisma_migrations
SET rolled_back_at = NOW()
WHERE finished_at IS NULL
  AND rolled_back_at IS NULL
  AND started_at IS NOT NULL;

-- Fix migration 20260623000000_add_file_extension_to_artefact.
-- This migration uses non-idempotent ALTER TABLE ADD COLUMN (no IF NOT EXISTS).
-- If a previous pod was killed after the column was added but before the
-- migration record was committed, the cleanup above marks it rolled_back_at,
-- then migrate deploy tries to re-run it and fails ("column already exists").
-- Prisma then skips it on subsequent runs (rolled_back_at IS NOT NULL),
-- leaving the migration record broken while the column is present.
-- Fix: if the column already exists, mark the migration as successfully
-- completed so migrate deploy skips it cleanly.
UPDATE _prisma_migrations
SET rolled_back_at = NULL,
    finished_at    = COALESCE(finished_at, NOW())
WHERE migration_name = '20260623000000_add_file_extension_to_artefact'
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name  = 'artefact'
      AND column_name = 'file_extension'
  );
