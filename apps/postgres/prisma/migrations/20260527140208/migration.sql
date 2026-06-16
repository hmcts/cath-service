-- AddForeignKey (idempotent — constraint may already exist from a prior deploy)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'artefact_list_type_id_fkey'
    AND table_name = 'artefact'
  ) THEN
    ALTER TABLE "artefact" ADD CONSTRAINT "artefact_list_type_id_fkey" FOREIGN KEY ("list_type_id") REFERENCES "list_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
