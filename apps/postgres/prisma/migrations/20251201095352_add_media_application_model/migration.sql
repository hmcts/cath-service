-- CreateTable
CREATE TABLE "media_application" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "employer" VARCHAR(255) NOT NULL,
    "proof_of_id_path" VARCHAR(500),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "applied_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_date" TIMESTAMP(3),
    "reviewed_by" VARCHAR(255),

    CONSTRAINT "media_application_pkey" PRIMARY KEY ("id")
);
