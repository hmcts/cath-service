-- AlterTable
-- Unmatched locations are now tracked by prefixing `location_id` with "NoMatch"
-- (see libs/publication/src/no-match-location.ts) instead of a dedicated boolean column.
ALTER TABLE "artefact" DROP COLUMN "no_match";
