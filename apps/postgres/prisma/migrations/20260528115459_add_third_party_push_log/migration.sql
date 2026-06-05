-- AddForeignKey
ALTER TABLE "artefact" ADD CONSTRAINT "artefact_list_type_id_fkey" FOREIGN KEY ("list_type_id") REFERENCES "list_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
