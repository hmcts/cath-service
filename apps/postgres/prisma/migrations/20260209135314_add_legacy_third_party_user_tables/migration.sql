-- CreateTable
CREATE TABLE "legacy_third_party_user" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legacy_third_party_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legacy_third_party_subscription" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "list_type_id" INTEGER NOT NULL,
    "channel" VARCHAR(20) NOT NULL DEFAULT 'API',
    "sensitivity" VARCHAR(20) NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legacy_third_party_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "legacy_third_party_subscription_user_id_idx" ON "legacy_third_party_subscription"("user_id");

-- CreateIndex
CREATE INDEX "legacy_third_party_subscription_list_type_id_idx" ON "legacy_third_party_subscription"("list_type_id");

-- AddForeignKey
ALTER TABLE "legacy_third_party_subscription" ADD CONSTRAINT "legacy_third_party_subscription_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "legacy_third_party_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
