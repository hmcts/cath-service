ALTER TABLE "artefact" ADD COLUMN IF NOT EXISTS "source_artefact_id" TEXT;

UPDATE "artefact"
SET "source_artefact_id" = "artefact_id" || COALESCE("file_extension", '.pdf')
WHERE "source_artefact_id" IS NULL
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artefact' AND column_name = 'file_extension'
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artefact' AND column_name = 'file_extension'
  ) THEN
    ALTER TABLE "artefact" DROP COLUMN "file_extension";
  END IF;
END $$;
