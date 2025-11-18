-- CreateTable
CREATE TABLE "region" (
    "region_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "welsh_name" TEXT NOT NULL,

    CONSTRAINT "region_pkey" PRIMARY KEY ("region_id")
);

-- CreateTable
CREATE TABLE "jurisdiction" (
    "jurisdiction_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "welsh_name" TEXT NOT NULL,

    CONSTRAINT "jurisdiction_pkey" PRIMARY KEY ("jurisdiction_id")
);

-- CreateTable
CREATE TABLE "sub_jurisdiction" (
    "sub_jurisdiction_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "welsh_name" TEXT NOT NULL,
    "jurisdiction_id" INTEGER NOT NULL,

    CONSTRAINT "sub_jurisdiction_pkey" PRIMARY KEY ("sub_jurisdiction_id")
);

-- CreateTable
CREATE TABLE "location" (
    "location_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "welsh_name" TEXT NOT NULL,
    "email" TEXT,
    "contact_no" TEXT,

    CONSTRAINT "location_pkey" PRIMARY KEY ("location_id")
);

-- CreateTable
CREATE TABLE "location_region" (
    "location_id" INTEGER NOT NULL,
    "region_id" INTEGER NOT NULL,

    CONSTRAINT "location_region_pkey" PRIMARY KEY ("location_id","region_id")
);

-- CreateTable
CREATE TABLE "location_sub_jurisdiction" (
    "location_id" INTEGER NOT NULL,
    "sub_jurisdiction_id" INTEGER NOT NULL,

    CONSTRAINT "location_sub_jurisdiction_pkey" PRIMARY KEY ("location_id","sub_jurisdiction_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "region_name_key" ON "region"("name");

-- CreateIndex
CREATE UNIQUE INDEX "region_welsh_name_key" ON "region"("welsh_name");

-- CreateIndex
CREATE UNIQUE INDEX "jurisdiction_name_key" ON "jurisdiction"("name");

-- CreateIndex
CREATE UNIQUE INDEX "jurisdiction_welsh_name_key" ON "jurisdiction"("welsh_name");

-- CreateIndex
CREATE UNIQUE INDEX "sub_jurisdiction_name_key" ON "sub_jurisdiction"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sub_jurisdiction_welsh_name_key" ON "sub_jurisdiction"("welsh_name");

-- CreateIndex
CREATE UNIQUE INDEX "location_name_key" ON "location"("name");

-- CreateIndex
CREATE UNIQUE INDEX "location_welsh_name_key" ON "location"("welsh_name");

-- AddForeignKey
ALTER TABLE "sub_jurisdiction" ADD CONSTRAINT "sub_jurisdiction_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdiction"("jurisdiction_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_region" ADD CONSTRAINT "location_region_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "location"("location_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_region" ADD CONSTRAINT "location_region_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "region"("region_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_sub_jurisdiction" ADD CONSTRAINT "location_sub_jurisdiction_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "location"("location_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_sub_jurisdiction" ADD CONSTRAINT "location_sub_jurisdiction_sub_jurisdiction_id_fkey" FOREIGN KEY ("sub_jurisdiction_id") REFERENCES "sub_jurisdiction"("sub_jurisdiction_id") ON DELETE RESTRICT ON UPDATE CASCADE;
