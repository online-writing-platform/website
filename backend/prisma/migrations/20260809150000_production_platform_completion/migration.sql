-- Production platform completion.
-- This is a forward-only, data-preserving migration. Existing rows keep safe defaults.

CREATE TYPE "StoryRights" AS ENUM ('ALL_RIGHTS_RESERVED', 'PUBLIC_DOMAIN', 'CREATIVE_COMMONS');
CREATE TYPE "ReaderTheme" AS ENUM ('SYSTEM', 'LIGHT', 'DARK', 'SEPIA');
CREATE TYPE "MediaProvider" AS ENUM ('LOCAL', 'S3');

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHAPTER_PUBLISHED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MODERATION';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SECURITY';

ALTER TABLE "stories"
    ADD COLUMN "cover_asset_id" UUID,
    ADD COLUMN "rights" "StoryRights" NOT NULL DEFAULT 'ALL_RIGHTS_RESERVED';

ALTER TABLE "chapters"
    ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "notifications"
    ADD COLUMN "dedupe_key" VARCHAR(200);

CREATE UNIQUE INDEX "notifications_dedupe_key_key"
    ON "notifications"("dedupe_key");

CREATE TABLE "user_preferences" (
    "user_id" UUID NOT NULL,
    "allow_mature_content" BOOLEAN NOT NULL DEFAULT false,
    "reader_theme" "ReaderTheme" NOT NULL DEFAULT 'SYSTEM',
    "font_scale" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "line_height" DOUBLE PRECISION NOT NULL DEFAULT 1.75,
    "notify_follow" BOOLEAN NOT NULL DEFAULT true,
    "notify_comment" BOOLEAN NOT NULL DEFAULT true,
    "notify_reply" BOOLEAN NOT NULL DEFAULT true,
    "notify_vote" BOOLEAN NOT NULL DEFAULT true,
    "notify_chapter_published" BOOLEAN NOT NULL DEFAULT true,
    "notify_moderation" BOOLEAN NOT NULL DEFAULT true,
    "notify_security" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "user_preferences_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_preferences_font_scale_check"
        CHECK ("font_scale" >= 0.75 AND "font_scale" <= 1.6),
    CONSTRAINT "user_preferences_line_height_check"
        CHECK ("line_height" >= 1.2 AND "line_height" <= 2.4)
);

CREATE TABLE "blocks" (
    "blocker_id" UUID NOT NULL,
    "blocked_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "blocks_pkey" PRIMARY KEY ("blocker_id", "blocked_id"),
    CONSTRAINT "blocks_blocker_id_fkey"
        FOREIGN KEY ("blocker_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "blocks_blocked_id_fkey"
        FOREIGN KEY ("blocked_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "blocks_no_self_check" CHECK ("blocker_id" <> "blocked_id")
);

CREATE INDEX "blocks_blocked_id_created_at_idx"
    ON "blocks"("blocked_id", "created_at");

CREATE TABLE "mutes" (
    "muter_id" UUID NOT NULL,
    "muted_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mutes_pkey" PRIMARY KEY ("muter_id", "muted_id"),
    CONSTRAINT "mutes_muter_id_fkey"
        FOREIGN KEY ("muter_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "mutes_muted_id_fkey"
        FOREIGN KEY ("muted_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "mutes_no_self_check" CHECK ("muter_id" <> "muted_id")
);

CREATE INDEX "mutes_muted_id_created_at_idx"
    ON "mutes"("muted_id", "created_at");

CREATE TABLE "chapter_reads" (
    "user_id" UUID NOT NULL,
    "story_id" UUID NOT NULL,
    "chapter_id" UUID NOT NULL,
    "first_read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chapter_reads_pkey" PRIMARY KEY ("user_id", "chapter_id"),
    CONSTRAINT "chapter_reads_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chapter_reads_story_id_fkey"
        FOREIGN KEY ("story_id") REFERENCES "stories"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chapter_reads_chapter_id_fkey"
        FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "chapter_reads_story_id_last_read_at_idx"
    ON "chapter_reads"("story_id", "last_read_at");

CREATE INDEX "chapter_reads_chapter_id_last_read_at_idx"
    ON "chapter_reads"("chapter_id", "last_read_at");

CREATE TABLE "media_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "provider" "MediaProvider" NOT NULL,
    "object_key" VARCHAR(500) NOT NULL,
    "public_url" TEXT NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "media_assets_owner_id_fkey"
        FOREIGN KEY ("owner_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "media_assets_size_check" CHECK ("byte_size" > 0),
    CONSTRAINT "media_assets_dimensions_check" CHECK ("width" > 0 AND "height" > 0)
);

CREATE UNIQUE INDEX "media_assets_object_key_key"
    ON "media_assets"("object_key");

CREATE INDEX "media_assets_owner_id_created_at_idx"
    ON "media_assets"("owner_id", "created_at");

CREATE INDEX "media_assets_deleted_at_idx"
    ON "media_assets"("deleted_at");

ALTER TABLE "stories"
    ADD CONSTRAINT "stories_cover_asset_id_fkey"
    FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "stories_cover_asset_id_idx" ON "stories"("cover_asset_id");

-- Avoid duplicate unresolved reports by the same reporter for the same target.
CREATE UNIQUE INDEX "reports_one_open_per_target"
    ON "reports"("reporter_id", "target_type", "target_id")
    WHERE "status" IN ('OPEN', 'REVIEWING');
