-- CreateTable
CREATE TABLE "subscription" (
    "subscription_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "subscribed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribed_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("subscription_id")
);

-- CreateIndex
CREATE INDEX "idx_subscription_user" ON "subscription"("user_id");

-- CreateIndex
CREATE INDEX "idx_subscription_location" ON "subscription"("location_id");

-- CreateIndex
CREATE INDEX "idx_subscription_active" ON "subscription"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_user_id_location_id_key" ON "subscription"("user_id", "location_id");
