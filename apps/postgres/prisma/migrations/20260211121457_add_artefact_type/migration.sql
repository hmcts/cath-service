-- Add type column to artefact table
ALTER TABLE artefact ADD COLUMN type VARCHAR(50);

-- Backfill existing records with 'LIST' type
UPDATE artefact SET type = 'LIST' WHERE type IS NULL;

-- Make type column NOT NULL after backfilling
ALTER TABLE artefact ALTER COLUMN type SET NOT NULL;

-- Add index for type lookups
CREATE INDEX idx_artefact_type ON artefact(type);
