import { prisma } from "../../db/index.js";
import AppError from "../../errors/app-error.js";

function requireFuture(date: Date): void {
    if (date.getTime() < Date.now() + 60_000) {
        throw AppError.domainRule(
            "Scheduled publication must be at least one minute in the future.",
            "INVALID_PUBLICATION_SCHEDULE",
        );
    }
}

export class SchedulingService {
    public async scheduleStory(authorId: string, storyId: string, scheduledAt: Date) {
        requireFuture(scheduledAt);
        return prisma.$transaction(async (transaction) => {
            const story = await transaction.story.findFirst({
                where: { id: storyId, authorId, deletedAt: null },
                select: {
                    id: true,
                    chapters: {
                        where: { deletedAt: null, status: "PUBLISHED", moderationState: "VISIBLE" },
                        take: 1,
                        select: { id: true },
                    },
                },
            });
            if (!story) throw AppError.notFound("The story was not found.", "STORY_NOT_FOUND");
            if (story.chapters.length === 0) {
                throw AppError.domainRule(
                    "At least one published chapter is required before scheduling a story.",
                    "PUBLISHED_CHAPTER_REQUIRED",
                );
            }
            const updated = await transaction.story.update({
                where: { id: storyId },
                data: { status: "SCHEDULED", scheduledAt },
                select: { id: true, status: true, scheduledAt: true },
            });
            await transaction.job.upsert({
                where: { dedupeKey: `publish-story:${storyId}:${scheduledAt.toISOString()}` },
                create: {
                    type: "PUBLISH_STORY",
                    dedupeKey: `publish-story:${storyId}:${scheduledAt.toISOString()}`,
                    payload: { storyId, scheduledAt: scheduledAt.toISOString() },
                    availableAt: scheduledAt,
                },
                update: { status: "PENDING", availableAt: scheduledAt, leaseUntil: null, lastError: null },
            });
            return updated;
        });
    }

    public async scheduleChapter(
        authorId: string,
        storyId: string,
        chapterId: string,
        expectedVersion: number,
        scheduledAt: Date,
    ) {
        requireFuture(scheduledAt);
        return prisma.$transaction(async (transaction) => {
            const chapter = await transaction.chapter.findFirst({
                where: { id: chapterId, storyId, deletedAt: null, story: { authorId, deletedAt: null } },
                select: { id: true, version: true, wordCount: true },
            });
            if (!chapter) throw AppError.notFound("The chapter was not found.", "CHAPTER_NOT_FOUND");
            if (chapter.version !== expectedVersion) {
                throw AppError.conflict("The chapter version is stale.", "VERSION_CONFLICT", { currentVersion: chapter.version });
            }
            if (chapter.wordCount === 0) {
                throw AppError.domainRule("An empty chapter cannot be scheduled.", "EMPTY_CHAPTER");
            }
            const updated = await transaction.chapter.update({
                where: { id: chapterId },
                data: { status: "SCHEDULED", scheduledAt, version: { increment: 1 } },
                select: { id: true, status: true, scheduledAt: true, version: true },
            });
            await transaction.job.upsert({
                where: { dedupeKey: `publish-chapter:${chapterId}:${scheduledAt.toISOString()}` },
                create: {
                    type: "PUBLISH_CHAPTER",
                    dedupeKey: `publish-chapter:${chapterId}:${scheduledAt.toISOString()}`,
                    payload: { chapterId, scheduledAt: scheduledAt.toISOString() },
                    availableAt: scheduledAt,
                },
                update: { status: "PENDING", availableAt: scheduledAt, leaseUntil: null, lastError: null },
            });
            return updated;
        });
    }
}
