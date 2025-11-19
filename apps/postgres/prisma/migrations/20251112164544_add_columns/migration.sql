-- AlterTable
ALTER TABLE "artefact" ADD COLUMN     "is_flat_file" BOOLEAN NOT NULL;

-- AlterTable
ALTER TABLE "artefact" ADD COLUMN     "provenance" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "artefact" ADD COLUMN     "superseded_count" INTEGER NOT NULL DEFAULT 0;
