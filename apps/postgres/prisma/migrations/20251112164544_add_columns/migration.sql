-- AlterTable
ALTER TABLE "artefact" ADD COLUMN     "is_flat_file" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "artefact" ADD COLUMN     "provenance" TEXT NOT NULL DEFAULT 'MANUAL_UPLOAD';
