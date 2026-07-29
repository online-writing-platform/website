-- CreateEnum
CREATE TYPE "StoryStatus" AS ENUM ('DRAFT', 'ONGOING', 'COMPLETED', 'HIATUS');

-- CreateEnum
CREATE TYPE "StoryVisibility" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');

-- CreateEnum
CREATE TYPE "ChapterStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "username" VARCHAR(30) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(80) NOT NULL,
    "bio" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stories" (
    "id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(220) NOT NULL,
    "description" TEXT NOT NULL,
    "cover_url" TEXT,
    "language" VARCHAR(10) NOT NULL DEFAULT 'fa',
    "status" "StoryStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "StoryVisibility" NOT NULL DEFAULT 'PRIVATE',
    "is_mature" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" UUID NOT NULL,
    "story_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "position" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "status" "ChapterStatus" NOT NULL DEFAULT 'DRAFT',
    "word_count" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "stories_slug_key" ON "stories"("slug");

-- CreateIndex
CREATE INDEX "stories_author_id_idx" ON "stories"("author_id");

-- CreateIndex
CREATE INDEX "stories_status_visibility_idx" ON "stories"("status", "visibility");

-- CreateIndex
CREATE INDEX "chapters_story_id_status_idx" ON "chapters"("story_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_story_id_position_key" ON "chapters"("story_id", "position");

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
