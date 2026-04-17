-- CreateTable
CREATE TABLE "subscription_list_type" (
    "list_type_subscription_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "list_type_id" INTEGER NOT NULL,
    "language" VARCHAR(10) NOT NULL,
    "date_added" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_list_type_pkey" PRIMARY KEY ("list_type_subscription_id")
);

-- CreateIndex
CREATE INDEX "idx_subscription_list_type_user" ON "subscription_list_type"("user_id");

-- CreateIndex
CREATE INDEX "idx_subscription_list_type_list_type" ON "subscription_list_type"("list_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_list_type_user_id_list_type_id_language_key" ON "subscription_list_type"("user_id", "list_type_id", "language");

-- AddForeignKey
ALTER TABLE "subscription_list_type" ADD CONSTRAINT "subscription_list_type_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
