-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('PASSWORD', 'PHONE', 'GOOGLE', 'APPLE');

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "provider_subject" VARCHAR(320) NOT NULL,
    "password_hash" VARCHAR(255),
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone_otp_challenges" (
    "id" UUID NOT NULL,
    "phone_number" VARCHAR(32) NOT NULL,
    "code_hash" VARCHAR(64) NOT NULL,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "phone_otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone_signup_grants" (
    "id" UUID NOT NULL,
    "phone_number" VARCHAR(32) NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phone_signup_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_identities_user_id_provider_idx" ON "auth_identities"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_provider_provider_subject_key" ON "auth_identities"("provider", "provider_subject");

-- CreateIndex
CREATE UNIQUE INDEX "phone_otp_challenges_phone_number_key" ON "phone_otp_challenges"("phone_number");

-- CreateIndex
CREATE INDEX "phone_otp_challenges_expires_at_idx" ON "phone_otp_challenges"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "phone_signup_grants_phone_number_key" ON "phone_signup_grants"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "phone_signup_grants_token_hash_key" ON "phone_signup_grants"("token_hash");

-- CreateIndex
CREATE INDEX "phone_signup_grants_expires_at_idx" ON "phone_signup_grants"("expires_at");

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
