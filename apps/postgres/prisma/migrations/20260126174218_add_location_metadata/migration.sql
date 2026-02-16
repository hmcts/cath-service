-- CreateTable
CREATE TABLE "location_metadata" (
    "location_metadata_id" TEXT NOT NULL,
    "location_id" INTEGER NOT NULL,
    "caution_message" TEXT,
    "welsh_caution_message" TEXT,
    "no_list_message" TEXT,
    "welsh_no_list_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location_metadata_pkey" PRIMARY KEY ("location_metadata_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "location_metadata_location_id_key" ON "location_metadata"("location_id");

-- AddForeignKey
ALTER TABLE "location_metadata" ADD CONSTRAINT "location_metadata_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "location"("location_id") ON DELETE CASCADE ON UPDATE CASCADE;
