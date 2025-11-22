-- CreateTable
CREATE TABLE "user" (
    "user_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(255),
    "surname" VARCHAR(255),
    "user_provenance" VARCHAR(20) NOT NULL,
    "user_provenance_id" VARCHAR(255) NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_signed_in_date" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_user_provenance_id_key" ON "user"("user_provenance_id");
