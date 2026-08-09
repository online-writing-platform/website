import { prisma } from "../../../db/index.js";
import { buildCursorPage } from "../../../shared/pagination/page.js";
import { isAtLeastAge } from "../../stories/domain/mature.policy.js";

import type { AnalyticsStore } from "../application/analytics.ports.js";

export class PrismaAnalyticsStore implements AnalyticsStore {
    public async recordRead(
        userId: string,
        storyId: string,
        chapterId: string,
        at: Date,
    ): Promise<void> {
        await prisma.chapterRead.upsert({
            where: { userId_chapterId: { userId, chapterId } },
            create: {
                userId,
                storyId,
                chapterId,
                firstReadAt: at,
                lastReadAt: at,
            },
            update: { lastReadAt: at },
            select: { userId: true },
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

        const rows = await prisma.chapterRead.findMany({
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
                    status: { not: "DRAFT" },
                    ...(includeMature ? {} : { isMature: false }),
                    author: {
                        status: "ACTIVE",
                        blocksCreated: { none: { blockedId: userId } },
                        blocksReceived: { none: { blockerId: userId } },
                    },
                },
            },
            orderBy: [{ lastReadAt: "desc" }, { chapterId: "desc" }],
            take: limit + 1,
            ...(cursor
                ? {
                      cursor: {
                          userId_chapterId: { userId, chapterId: cursor },
                      },
                      skip: 1,
                  }
                : {}),
            select: {
                chapterId: true,
                lastReadAt: true,
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

        const page = buildCursorPage(rows, limit, (row) => row.chapterId);

        return {
            items: page.items.map(({ chapterId: _chapterId, ...item }) => item),
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
                                reads: true,
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
            FROM "chapter_reads"
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
                uniqueReaders: chapter._count.reads,
                votes: chapter._count.votes,
                comments: chapter._count.comments,
            })),
        };
    }
}
