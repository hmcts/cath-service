-- CreateTable
CREATE TABLE "subscription" (
    "subscription_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "location_id" TEXT NOT NULL,
    "date_added" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("subscription_id")
);

-- CreateIndex
CREATE INDEX "idx_subscription_user" ON "subscription"("user_id");

-- CreateIndex
CREATE INDEX "idx_subscription_location" ON "subscription"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_user_id_location_id_key" ON "subscription"("user_id", "location_id");

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
