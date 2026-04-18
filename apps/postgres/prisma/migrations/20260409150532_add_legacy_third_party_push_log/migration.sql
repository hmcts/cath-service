-- CreateTable
CREATE TABLE "legacy_third_party_push_log" (
    "id" UUID NOT NULL,
    "artefact_id" VARCHAR(255) NOT NULL,
    "list_type_id" INTEGER NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "status_code" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legacy_third_party_push_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "legacy_third_party_push_log_artefact_id_idx" ON "legacy_third_party_push_log"("artefact_id");

-- CreateIndex
CREATE INDEX "legacy_third_party_push_log_list_type_id_idx" ON "legacy_third_party_push_log"("list_type_id");
