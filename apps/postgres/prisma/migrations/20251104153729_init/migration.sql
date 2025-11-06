-- CreateTable
CREATE TABLE "artefact" (
    "artefact_id" UUID NOT NULL,
    "location_id" TEXT NOT NULL,
    "list_type_id" INTEGER NOT NULL,
    "content_date" DATE NOT NULL,
    "sensitivity" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "display_from" TIMESTAMP(3) NOT NULL,
    "display_to" TIMESTAMP(3) NOT NULL,
    "last_received_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artefact_pkey" PRIMARY KEY ("artefact_id")
);
