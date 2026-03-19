-- CreateTable
CREATE TABLE "list_search_config" (
    "id" TEXT NOT NULL,
    "list_type_id" INTEGER NOT NULL,
    "case_number_field_name" VARCHAR(100) NOT NULL,
    "case_name_field_name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "list_search_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "list_search_config_list_type_id_key" ON "list_search_config"("list_type_id");
