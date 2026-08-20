import { prisma } from "../../db/index.js";
import { createHash } from "node:crypto";
import { buildCursorPage } from "../../shared/pagination/page.js";
import { isAtLeastAge } from "../stories/stories.policy.js";

import type { AnalyticsStore } from "./analytics.types.js";
import { readSignalBucket } from "../reading/reading-events.js";

export class AnalyticsRepository implements AnalyticsStore {
    public async recordRead(
        userId: string | null,
        visitorKey: string,
        storyId: string,
        chapterId: string,
        at: Date,
    ): Promise<void> {
        const dedupeKey = userId
            ? createHash("sha256").update(`user:${userId}`).digest("hex")
            : visitorKey;
        await prisma.readSignal.upsert({
            where: {
                visitorKey_chapterId_bucketStart: {
                    visitorKey: dedupeKey,
                    chapterId,
                    bucketStart: new Date(readSignalBucket(at, 60)),
                },
            },
            create: {
                userId,
                storyId,
                chapterId,
                actorType: userId ? "AUTHENTICATED" : "ANONYMOUS",
                visitorKey: dedupeKey,
                bucketStart: new Date(readSignalBucket(at, 60)),
                qualifiedAt: at,
            },
            update: {},
            select: { id: true },
        });
    }



    public async listReadingHistory(
        userId: string,
        cursor: string | undefined,
        limit: number,
    ) {
        const viewer = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                birthDate: true,
                status: true,
                preferences: { select: { allowMatureContent: true } },
            },
        });

        const includeMature =
            viewer?.status === "ACTIVE" &&
            viewer.preferences?.allowMatureContent === true &&
            isAtLeastAge(viewer.birthDate, 18, new Date());

        const rows = await prisma.readingHistory.findMany({
            where: {
                userId,
                chapter: {
                    deletedAt: null,
                    status: "PUBLISHED",
                    moderationState: "VISIBLE",
                },
                story: {
                    deletedAt: null,
                    moderationState: "VISIBLE",
                    visibility: { in: ["PUBLIC", "UNLISTED"] },
                    publishedAt: { not: null },
                    status: { in: ["ONGOING", "COMPLETED", "HIATUS"] },
                    ...(includeMature ? {} : { isMature: false }),
                    author: {
                        status: "ACTIVE",
                        blocksCreated: { none: { blockedId: userId } },
                        blocksReceived: { none: { blockerId: userId } },
                    },
                },
            },
            orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
            take: limit + 1,
            ...(cursor
                ? {
                      cursor: { id: cursor },
                      skip: 1,
                  }
                : {}),
            select: {
                id: true,
                occurredAt: true,
                chapter: { select: { id: true, title: true } },
                story: {
                    select: {
                        id: true,
                        slug: true,
                        title: true,
                        coverUrl: true,
                        isMature: true,
                        author: {
                            select: {
                                username: true,
                                displayName: true,
                            },
                        },
                    },
                },
            },
        });

        const page = buildCursorPage(rows, limit, (row) => row.id);

        return {
            items: page.items
                .filter((item): item is typeof item & { chapter: NonNullable<typeof item.chapter> } => item.chapter !== null)
                .map(({ id: _id, occurredAt, ...item }) => ({ ...item, lastReadAt: occurredAt })),
            pagination: page.pagination,
        };
    }

    public async getStoryAnalytics(
        authorId: string,
        storyId: string,
    ) {
        const story = await prisma.story.findFirst({
            where: { id: storyId, authorId, deletedAt: null },
            select: {
                id: true,
                title: true,
                slug: true,
                _count: {
                    select: {
                        libraryEntries: true,
                        readingProgress: true,
                    },
                },
                chapters: {
                    where: { deletedAt: null },
                    orderBy: { position: "asc" },
                    select: {
                        id: true,
                        title: true,
                        position: true,
                        _count: {
                            select: {
                                readSignals: true,
                                votes: true,
                                comments: true,
                            },
                        },
                    },
                },
            },
        });

        if (!story) return null;

        const uniqueReaderRows = await prisma.$queryRaw<Array<{ count: number }>>`
            SELECT COUNT(DISTINCT "user_id")::int AS "count"
            FROM "read_signals"
            WHERE "story_id" = ${storyId}::uuid
        `;
        const uniqueReaders = uniqueReaderRows.at(0)?.count ?? 0;

        return {
            story: {
                id: story.id,
                title: story.title,
                slug: story.slug,
            },
            uniqueReaders,
            librarySaves: story._count.libraryEntries,
            activeProgressReaders: story._count.readingProgress,
            chapters: story.chapters.map((chapter) => ({
                id: chapter.id,
                title: chapter.title,
                position: chapter.position,
                uniqueReaders: chapter._count.readSignals,
                votes: chapter._count.votes,
                comments: chapter._count.comments,
            })),
        };
    }
}
