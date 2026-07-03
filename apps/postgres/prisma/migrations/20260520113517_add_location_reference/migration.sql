-- AlterTable
ALTER TABLE "list_types" ADD COLUMN     "location_type" VARCHAR(50);

-- CreateTable
CREATE TABLE "location_reference" (
    "location_reference_id" TEXT NOT NULL,
    "location_id" INTEGER NOT NULL,
    "provenance" VARCHAR(50) NOT NULL,
    "provenance_location_id" VARCHAR(255) NOT NULL,
    "provenance_location_type" VARCHAR(50) NOT NULL,

    CONSTRAINT "location_reference_pkey" PRIMARY KEY ("location_reference_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "location_reference_provenance_provenance_location_id_key" ON "location_reference"("provenance", "provenance_location_id");

-- AddForeignKey
ALTER TABLE "location_reference" ADD CONSTRAINT "location_reference_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "location"("location_id") ON DELETE CASCADE ON UPDATE CASCADE;
