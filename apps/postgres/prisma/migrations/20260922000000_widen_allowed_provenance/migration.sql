-- Widen allowed_provenance to accommodate multiple comma-delimited provenances.
-- Catalog-only type change (no table rewrite, no data loss).
ALTER TABLE "list_types" ALTER COLUMN "allowed_provenance" TYPE VARCHAR(255);
