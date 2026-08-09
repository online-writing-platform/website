/*
  Warnings:

  - You are about to drop the column `is_persistent` on the `sessions` table. All the data in the column will be lost.
  - You are about to alter the column `username` on the `users` table. The data in that column could be lost. The data in that column will be cast from `VarChar(30)` to `VarChar(20)`.
  - A unique constraint covering the columns `[username_normalized]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `birth_date` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username_normalized` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- DropIndex
DROP INDEX "users_username_key";

-- AlterTable
ALTER TABLE "sessions" DROP COLUMN "is_persistent";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "birth_date" DATE NOT NULL,
ADD COLUMN     "email_verified_at" TIMESTAMP(3),
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "username_normalized" VARCHAR(20) NOT NULL,
ALTER COLUMN "username" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "terms_version" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "users_username_normalized_key" ON "users"("username_normalized");
