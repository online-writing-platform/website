/*
  Warnings:

  - You are about to drop the `phone_signup_grants` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "verified_at" TIMESTAMP(3),
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "password_hash" DROP NOT NULL;

-- DropTable
DROP TABLE "phone_signup_grants";

-- CreateTable
CREATE TABLE "auth_signup_grants" (
    "id" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "provider_subject" VARCHAR(320) NOT NULL,
    "email" VARCHAR(320),
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "display_name" VARCHAR(80),
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_signup_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_signup_grants_token_hash_key" ON "auth_signup_grants"("token_hash");

-- CreateIndex
CREATE INDEX "auth_signup_grants_expires_at_idx" ON "auth_signup_grants"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "auth_signup_grants_provider_provider_subject_key" ON "auth_signup_grants"("provider", "provider_subject");
