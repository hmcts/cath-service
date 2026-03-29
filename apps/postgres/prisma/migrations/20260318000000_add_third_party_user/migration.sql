-- CreateTable
CREATE TABLE "third_party_user" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "third_party_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "third_party_subscription" (
    "id" TEXT NOT NULL,
    "third_party_user_id" TEXT NOT NULL,
    "list_type" VARCHAR(100) NOT NULL,
    "sensitivity" VARCHAR(20) NOT NULL,

    CONSTRAINT "third_party_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "third_party_subscription_third_party_user_id_list_type_key" ON "third_party_subscription"("third_party_user_id", "list_type");

-- AddForeignKey
ALTER TABLE "third_party_subscription" ADD CONSTRAINT "third_party_subscription_third_party_user_id_fkey" FOREIGN KEY ("third_party_user_id") REFERENCES "third_party_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
