-- DropForeignKey
ALTER TABLE "ingestion_log" DROP CONSTRAINT "fk_blob_artefact";

-- AlterTable
ALTER TABLE "ingestion_log" ALTER COLUMN "id" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "ingestion_log" ADD CONSTRAINT "ingestion_log_artefact_id_fkey" FOREIGN KEY ("artefact_id") REFERENCES "artefact"("artefact_id") ON DELETE SET NULL ON UPDATE CASCADE;
