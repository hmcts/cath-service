-- CreateTable
CREATE TABLE "user_archive" (
    "user_id" UUID NOT NULL,
    "user_provenance" VARCHAR(255),
    "provenance_user_id" VARCHAR(255),
    "email" VARCHAR(255),
    "roles" VARCHAR(255),
    "last_signed_in_date" TIMESTAMP(3),
    "archived_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_archive_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "user_archive_archived_date_idx" ON "user_archive"("archived_date");

