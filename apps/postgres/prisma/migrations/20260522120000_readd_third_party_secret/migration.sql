-- CreateTable
CREATE TABLE "third_party_secret" (
    "name" VARCHAR(255) NOT NULL,
    "value" VARCHAR(1000) NOT NULL,

    CONSTRAINT "third_party_secret_pkey" PRIMARY KEY ("name")
);
