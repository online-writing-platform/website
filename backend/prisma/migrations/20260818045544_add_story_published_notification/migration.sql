-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'STORY_PUBLISHED';

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actor_id_fkey";

-- DropForeignKey
ALTER TABLE "chapter_revisions" DROP CONSTRAINT "chapter_revisions_chapter_id_fkey";

-- DropForeignKey
ALTER TABLE "chapter_revisions" DROP CONSTRAINT "chapter_revisions_created_by_fkey";

-- DropForeignKey
ALTER TABLE "chapter_revisions" DROP CONSTRAINT "chapter_revisions_restored_from_id_fkey";

-- DropForeignKey
ALTER TABLE "consumed_refresh_tokens" DROP CONSTRAINT "consumed_refresh_tokens_session_id_fkey";

-- DropForeignKey
ALTER TABLE "daily_story_metrics" DROP CONSTRAINT "daily_story_metrics_story_id_fkey";

-- DropForeignKey
ALTER TABLE "read_signals" DROP CONSTRAINT "read_signals_chapter_id_fkey";

-- DropForeignKey
ALTER TABLE "read_signals" DROP CONSTRAINT "read_signals_story_id_fkey";

-- DropForeignKey
ALTER TABLE "read_signals" DROP CONSTRAINT "read_signals_user_id_fkey";

-- DropForeignKey
ALTER TABLE "reading_history" DROP CONSTRAINT "reading_history_chapter_id_fkey";

-- DropForeignKey
ALTER TABLE "reading_history" DROP CONSTRAINT "reading_history_story_id_fkey";

-- DropForeignKey
ALTER TABLE "reading_history" DROP CONSTRAINT "reading_history_user_id_fkey";

-- DropForeignKey
ALTER TABLE "story_stats" DROP CONSTRAINT "story_stats_story_id_fkey";

-- DropForeignKey
ALTER TABLE "user_stats" DROP CONSTRAINT "user_stats_user_id_fkey";

-- DropIndex
DROP INDEX "stories_search_text_trgm_idx";

-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "chapter_revisions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "jobs" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "media_assets" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "outbox_messages" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "read_signals" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "reading_history" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "story_stats" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_preferences" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_stats" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "consumed_refresh_tokens" ADD CONSTRAINT "consumed_refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_revisions" ADD CONSTRAINT "chapter_revisions_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_revisions" ADD CONSTRAINT "chapter_revisions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_revisions" ADD CONSTRAINT "chapter_revisions_restored_from_id_fkey" FOREIGN KEY ("restored_from_id") REFERENCES "chapter_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "read_signals" ADD CONSTRAINT "read_signals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "read_signals" ADD CONSTRAINT "read_signals_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "read_signals" ADD CONSTRAINT "read_signals_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_stats" ADD CONSTRAINT "story_stats_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_story_metrics" ADD CONSTRAINT "daily_story_metrics_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
