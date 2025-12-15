-- CreateTable
CREATE TABLE "list_types_sub_jurisdictions" (
    "id" SERIAL NOT NULL,
    "list_type_id" INTEGER NOT NULL,
    "sub_jurisdiction_id" INTEGER NOT NULL,

    CONSTRAINT "list_types_sub_jurisdictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "list_types" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(1000) NOT NULL,
    "friendly_name" VARCHAR(1000),
    "welsh_friendly_name" VARCHAR(255),
    "shortened_friendly_name" VARCHAR(255),
    "url" VARCHAR(255),
    "default_sensitivity" VARCHAR(50),
    "allowed_provenance" VARCHAR(50) NOT NULL,
    "is_non_strategic" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "list_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "list_types_sub_jurisdictions_list_type_id_sub_jurisdiction__key" ON "list_types_sub_jurisdictions"("list_type_id", "sub_jurisdiction_id");

-- CreateIndex
CREATE UNIQUE INDEX "list_types_name_key" ON "list_types"("name");

-- AddForeignKey
ALTER TABLE "list_types_sub_jurisdictions" ADD CONSTRAINT "list_types_sub_jurisdictions_list_type_id_fkey" FOREIGN KEY ("list_type_id") REFERENCES "list_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_types_sub_jurisdictions" ADD CONSTRAINT "list_types_sub_jurisdictions_sub_jurisdiction_id_fkey" FOREIGN KEY ("sub_jurisdiction_id") REFERENCES "sub_jurisdiction"("sub_jurisdiction_id") ON DELETE RESTRICT ON UPDATE CASCADE;
