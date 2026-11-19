-- CreateTable
CREATE TABLE "artefact_archive" (
    "artefact_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "location_id" TEXT NOT NULL,
    "list_type_name" VARCHAR(1000) NOT NULL,
    "content_date" DATE NOT NULL,
    "sensitivity" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "display_from" TIMESTAMP(3),
    "display_to" TIMESTAMP(3),
    "is_flat_file" BOOLEAN NOT NULL,
    "provenance" TEXT NOT NULL,
    "source_artefact_id" TEXT,
    "superseded_count" INTEGER NOT NULL,
    "last_received_date" TIMESTAMP(3) NOT NULL,
    "archived_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artefact_archive_pkey" PRIMARY KEY ("artefact_id")
);

-- CreateIndex
CREATE INDEX "artefact_archive_archived_date_idx" ON "artefact_archive"("archived_date");

