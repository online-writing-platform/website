-- Production backend redesign. Forward-only, data-preserving transition.
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "RevisionReason" AS ENUM ('CHECKPOINT', 'PUBLISH', 'UNPUBLISH', 'RESTORE_SOURCE', 'RESTORED');
CREATE TYPE "ReadingHistoryType" AS ENUM ('STARTED', 'CHAPTER_CHANGED', 'RESUMED', 'COMPLETED');
CREATE TYPE "ReadActorType" AS ENUM ('AUTHENTICATED', 'ANONYMOUS');
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'DEAD', 'CANCELLED');
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'DISPATCHED', 'DEAD');
ALTER TYPE "StoryStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED';
ALTER TYPE "StoryStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';
ALTER TYPE "ChapterStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED';

ALTER TABLE "stories"
  ADD COLUMN "ordering_version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "scheduled_at" TIMESTAMP(3),
  ADD COLUMN "search_text" TEXT NOT NULL DEFAULT '';
ALTER TABLE "chapters"
  ADD COLUMN "content_hash" CHAR(64) NOT NULL DEFAULT '',
  ADD COLUMN "scheduled_at" TIMESTAMP(3);
ALTER TABLE "reading_progress"
  ADD COLUMN "anchor" VARCHAR(200),
  ADD COLUMN "completed_at" TIMESTAMP(3);
ALTER TABLE "reading_lists"
  ADD COLUMN "ordering_version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "reading_list_items" ADD COLUMN "position" INTEGER;

UPDATE "chapters"
SET "content_hash" = encode(
  digest(
    convert_to("title", 'UTF8') || decode('00', 'hex') || convert_to("content", 'UTF8'),
    'sha256'
  ),
  'hex'
);
WITH positions AS (
  SELECT "reading_list_id", "story_id",
         row_number() OVER (PARTITION BY "reading_list_id" ORDER BY "added_at", "story_id")::integer AS position
  FROM "reading_list_items"
)
UPDATE "reading_list_items" AS item
SET "position" = positions.position
FROM positions
WHERE item."reading_list_id" = positions."reading_list_id"
  AND item."story_id" = positions."story_id";
ALTER TABLE "reading_list_items" ALTER COLUMN "position" SET NOT NULL;

CREATE TABLE "consumed_refresh_tokens" (
  "token_hash" CHAR(64) PRIMARY KEY,
  "session_id" UUID NOT NULL REFERENCES "sessions"("id") ON DELETE CASCADE,
  "consumed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "replayed_at" TIMESTAMP(3)
);
CREATE INDEX "consumed_refresh_tokens_session_id_consumed_at_idx" ON "consumed_refresh_tokens"("session_id", "consumed_at");
CREATE INDEX "consumed_refresh_tokens_expires_at_idx" ON "consumed_refresh_tokens"("expires_at");

CREATE TABLE "chapter_revisions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "chapter_id" UUID NOT NULL REFERENCES "chapters"("id") ON DELETE CASCADE,
  "created_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "revision_number" INTEGER NOT NULL,
  "source_version" INTEGER NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "content" TEXT NOT NULL,
  "content_hash" CHAR(64) NOT NULL,
  "word_count" INTEGER NOT NULL,
  "reason" "RevisionReason" NOT NULL,
  "protected" BOOLEAN NOT NULL DEFAULT false,
  "restored_from_id" UUID REFERENCES "chapter_revisions"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chapter_revisions_chapter_id_revision_number_key" UNIQUE ("chapter_id", "revision_number")
);
CREATE INDEX "chapter_revisions_chapter_id_created_at_idx" ON "chapter_revisions"("chapter_id", "created_at");

CREATE TABLE "reading_history" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "story_id" UUID NOT NULL REFERENCES "stories"("id") ON DELETE CASCADE,
  "chapter_id" UUID REFERENCES "chapters"("id") ON DELETE SET NULL,
  "type" "ReadingHistoryType" NOT NULL,
  "progress" DOUBLE PRECISION NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "reading_history_user_id_occurred_at_id_idx" ON "reading_history"("user_id", "occurred_at", "id");
CREATE INDEX "reading_history_story_id_occurred_at_idx" ON "reading_history"("story_id", "occurred_at");

CREATE TABLE "read_signals" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "story_id" UUID NOT NULL REFERENCES "stories"("id") ON DELETE CASCADE,
  "chapter_id" UUID NOT NULL REFERENCES "chapters"("id") ON DELETE CASCADE,
  "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "actor_type" "ReadActorType" NOT NULL,
  "visitor_key" CHAR(64) NOT NULL,
  "bucket_start" TIMESTAMP(3) NOT NULL,
  "qualified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "read_signals_visitor_key_chapter_id_bucket_start_key" UNIQUE ("visitor_key", "chapter_id", "bucket_start")
);
CREATE INDEX "read_signals_story_id_qualified_at_idx" ON "read_signals"("story_id", "qualified_at");
CREATE INDEX "read_signals_user_id_story_id_idx" ON "read_signals"("user_id", "story_id");

-- Preserve prior meaningful authenticated read records as both history and deduplicated signals.
INSERT INTO "reading_history" ("user_id", "story_id", "chapter_id", "type", "progress", "occurred_at")
SELECT "user_id", "story_id", "chapter_id", 'CHAPTER_CHANGED'::"ReadingHistoryType", 0, "last_read_at"
FROM "chapter_reads";
INSERT INTO "read_signals" ("story_id", "chapter_id", "user_id", "actor_type", "visitor_key", "bucket_start", "qualified_at")
SELECT "story_id", "chapter_id", "user_id", 'AUTHENTICATED'::"ReadActorType",
       encode(digest('user:' || "user_id"::text, 'sha256'), 'hex'),
       date_trunc('hour', "last_read_at"), "last_read_at"
FROM "chapter_reads"
ON CONFLICT DO NOTHING;
DROP TABLE "chapter_reads";

CREATE TABLE "story_stats" (
  "story_id" UUID PRIMARY KEY REFERENCES "stories"("id") ON DELETE CASCADE,
  "vote_count" INTEGER NOT NULL DEFAULT 0,
  "comment_count" INTEGER NOT NULL DEFAULT 0,
  "library_count" INTEGER NOT NULL DEFAULT 0,
  "authenticated_readers" INTEGER NOT NULL DEFAULT 0,
  "qualified_views" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "user_stats" (
  "user_id" UUID PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "follower_count" INTEGER NOT NULL DEFAULT 0,
  "following_count" INTEGER NOT NULL DEFAULT 0,
  "published_story_count" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "daily_story_metrics" (
  "story_id" UUID NOT NULL REFERENCES "stories"("id") ON DELETE CASCADE,
  "day" DATE NOT NULL,
  "qualified_views" INTEGER NOT NULL DEFAULT 0,
  "unique_readers" INTEGER NOT NULL DEFAULT 0,
  "votes" INTEGER NOT NULL DEFAULT 0,
  "comments" INTEGER NOT NULL DEFAULT 0,
  "library_adds" INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("story_id", "day")
);
CREATE INDEX "daily_story_metrics_day_qualified_views_idx" ON "daily_story_metrics"("day", "qualified_views");

INSERT INTO "story_stats" ("story_id", "vote_count", "comment_count", "library_count", "authenticated_readers", "qualified_views")
SELECT story."id",
       (SELECT count(*) FROM "chapter_votes" vote JOIN "chapters" chapter ON chapter."id" = vote."chapter_id" WHERE chapter."story_id" = story."id"),
       (SELECT count(*) FROM "comments" comment JOIN "chapters" chapter ON chapter."id" = comment."chapter_id" WHERE chapter."story_id" = story."id" AND comment."status" = 'ACTIVE'),
       (SELECT count(*) FROM "library_entries" entry WHERE entry."story_id" = story."id"),
       (SELECT count(DISTINCT signal."user_id") FROM "read_signals" signal WHERE signal."story_id" = story."id" AND signal."user_id" IS NOT NULL),
       (SELECT count(*) FROM "read_signals" signal WHERE signal."story_id" = story."id")
FROM "stories" story;
INSERT INTO "user_stats" ("user_id", "follower_count", "following_count", "published_story_count")
SELECT user_row."id",
       (SELECT count(*) FROM "follows" follow_row WHERE follow_row."following_id" = user_row."id"),
       (SELECT count(*) FROM "follows" follow_row WHERE follow_row."follower_id" = user_row."id"),
       (SELECT count(*) FROM "stories" story WHERE story."author_id" = user_row."id" AND story."published_at" IS NOT NULL AND story."deleted_at" IS NULL)
FROM "users" user_row;

CREATE TABLE "outbox_messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_type" VARCHAR(120) NOT NULL,
  "aggregate_type" VARCHAR(80) NOT NULL,
  "aggregate_id" VARCHAR(120) NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lease_until" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" VARCHAR(2000),
  "dispatched_at" TIMESTAMP(3)
);
CREATE INDEX "outbox_messages_status_available_at_idx" ON "outbox_messages"("status", "available_at");
CREATE INDEX "outbox_messages_aggregate_type_aggregate_id_occurred_at_idx" ON "outbox_messages"("aggregate_type", "aggregate_id", "occurred_at");
CREATE TABLE "jobs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" VARCHAR(120) NOT NULL,
  "dedupe_key" VARCHAR(240) NOT NULL UNIQUE,
  "payload" JSONB NOT NULL,
  "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
  "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lease_until" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 10,
  "last_error" VARCHAR(2000),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "jobs_status_available_at_idx" ON "jobs"("status", "available_at");
CREATE INDEX "jobs_lease_until_idx" ON "jobs"("lease_until");

CREATE TABLE "audit_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "actor_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "action" VARCHAR(120) NOT NULL,
  "target_type" VARCHAR(80) NOT NULL,
  "target_id" VARCHAR(120),
  "request_id" VARCHAR(128),
  "ip_hash" CHAR(64),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");
CREATE INDEX "audit_logs_target_type_target_id_created_at_idx" ON "audit_logs"("target_type", "target_id", "created_at");
CREATE FUNCTION reject_audit_log_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$;
CREATE TRIGGER audit_logs_append_only
BEFORE UPDATE OR DELETE ON "audit_logs"
FOR EACH ROW EXECUTE FUNCTION reject_audit_log_mutation();

-- Deferrable uniqueness permits one final set-based reorder without temporary invalid positions.
DROP INDEX "chapters_story_id_position_key";
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_story_id_position_key"
  UNIQUE ("story_id", "position") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "reading_list_items" ADD CONSTRAINT "reading_list_items_reading_list_id_position_key"
  UNIQUE ("reading_list_id", "position") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_position_positive" CHECK ("position" > 0);
ALTER TABLE "reading_list_items" ADD CONSTRAINT "reading_list_items_position_positive" CHECK ("position" > 0);
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_range" CHECK ("progress" >= 0 AND "progress" <= 1);

CREATE FUNCTION writing_search_text(title text, description text) RETURNS text
LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT trim(regexp_replace(lower(unaccent(translate(
    coalesce(title, '') || ' ' || coalesce(description, ''),
    'يىئكۀة۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩',
    'یییکهه01234567890123456789'
  ))), '\s+', ' ', 'g'));
$$;
CREATE FUNCTION update_story_search_text() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW."search_text" := writing_search_text(NEW."title", NEW."description");
  RETURN NEW;
END;
$$;
CREATE TRIGGER stories_search_text_write
BEFORE INSERT OR UPDATE OF "title", "description" ON "stories"
FOR EACH ROW EXECUTE FUNCTION update_story_search_text();
UPDATE "stories" SET "search_text" = writing_search_text("title", "description");
CREATE INDEX "stories_search_text_trgm_idx" ON "stories" USING GIN ("search_text" gin_trgm_ops);
CREATE INDEX "stories_search_text_fts_idx" ON "stories" USING GIN (to_tsvector('simple', "search_text"));
CREATE INDEX "users_username_trgm_idx" ON "users" USING GIN (lower("username") gin_trgm_ops);
CREATE INDEX "users_display_name_trgm_idx" ON "users" USING GIN (lower("display_name") gin_trgm_ops);
CREATE INDEX "stories_status_scheduled_at_idx" ON "stories"("status", "scheduled_at");
CREATE INDEX "chapters_status_scheduled_at_idx" ON "chapters"("status", "scheduled_at");
CREATE INDEX "jobs_pending_partial_idx" ON "jobs"("available_at", "id") WHERE "status" IN ('PENDING', 'RUNNING');
CREATE INDEX "outbox_pending_partial_idx" ON "outbox_messages"("available_at", "id") WHERE "status" IN ('PENDING', 'PROCESSING');
