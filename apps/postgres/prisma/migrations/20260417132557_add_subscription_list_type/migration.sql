-- CreateTable
CREATE TABLE "subscription_list_type" (
    "subscription_list_type_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "list_type_ids" INTEGER[] NOT NULL,
    "list_language" TEXT[] NOT NULL,
    "date_added" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_list_type_pkey" PRIMARY KEY ("subscription_list_type_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_list_type_user_id_key" ON "subscription_list_type"("user_id");

-- AddForeignKey
ALTER TABLE "subscription_list_type" ADD CONSTRAINT "subscription_list_type_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
