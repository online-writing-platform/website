import { createHash } from "node:crypto";
import { prisma } from "../../db/index.js";
import { buildCursorPage } from "../../shared/pagination/page.js";
import { readSignalBucket, shouldRecordMeaningfulHistory } from "./reading-events.js";
import { buildVisibleStoryWhere, storySummarySelect } from "./reading.visibility.js";

export class ProgressRepository {
    public async upsertProgress(
        userId: string,
        storyId: string,
        chapterId: string | undefined,
        progress: number,
        anchor: string | undefined,
        qualified: boolean,
        readAt: Date,
    ) {
        await prisma.$transaction(async (transaction) => {
            const previous = await transaction.readingProgress.findUnique({
                where: { userId_storyId: { userId, storyId } },
                select: { chapterId: true, lastReadAt: true, progress: true },
            });
            await transaction.readingProgress.upsert({
                where: {
                    userId_storyId: {
                        userId,
                        storyId,
                    },
                },
                create: {
                    userId,
                    storyId,
                    ...(chapterId
                        ? {
                              chapterId,
                          }
                        : {}),
                    progress,
                    anchor,
                    ...(progress >= 1 ? { completedAt: readAt } : {}),
                    lastReadAt: readAt,
                },
                update: {
                    chapterId: chapterId ?? null,
                    progress,
                    anchor: anchor ?? null,
                    completedAt: progress >= 1 ? readAt : null,
                    lastReadAt: readAt,
                },
            });

            if (
                shouldRecordMeaningfulHistory({
                    previousChapterId: previous?.chapterId ?? null,
                    nextChapterId: chapterId ?? null,
                    previousReadAt: previous?.lastReadAt ?? null,
                    now: readAt,
                    completed: progress >= 1 && (previous?.progress ?? 0) < 1,
                })
            ) {
                const type =
                    progress >= 1
                        ? "COMPLETED"
                        : previous === null
                          ? "STARTED"
                          : previous.chapterId !== (chapterId ?? null)
                            ? "CHAPTER_CHANGED"
                            : "RESUMED";
                await transaction.readingHistory.create({
                    data: { userId, storyId, chapterId, progress, type },
                });
                const excess = await transaction.readingHistory.findMany({
                    where: { userId },
                    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
                    skip: 200,
                    select: { id: true },
                });
                if (excess.length > 0) {
                    await transaction.readingHistory.deleteMany({
                        where: { id: { in: excess.map(({ id }) => id) } },
                    });
                }
            }

            if (qualified && chapterId) {
                const visitorKey = createHash("sha256")
                    .update(`user:${userId}`)
                    .digest("hex");
                await transaction.readSignal.upsert({
                    where: {
                        visitorKey_chapterId_bucketStart: {
                            visitorKey,
                            chapterId,
                            bucketStart: new Date(readSignalBucket(readAt, 60)),
                        },
                    },
                    create: {
                        userId,
                        storyId,
                        chapterId,
                        actorType: "AUTHENTICATED",
                        visitorKey,
                        bucketStart: new Date(readSignalBucket(readAt, 60)),
                    },
                    update: {},
                });
            }
        });

        return prisma.readingProgress.findUniqueOrThrow({
            where: {
                userId_storyId: {
                    userId,
                    storyId,
                },
            },
            select: {
                progress: true,
                anchor: true,
                completedAt: true,
                lastReadAt: true,
                chapter: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                story: {
                    select: storySummarySelect,
                },
            },
        });
    }

    public async listProgress(
        userId: string,
        cursor: string | undefined,
        limit: number,
    ) {
        const visibleStoryWhere = await buildVisibleStoryWhere(userId);
        const rows = await prisma.readingProgress.findMany({
            where: {
                userId,
                story: visibleStoryWhere,
            },
            orderBy: [
                {
                    lastReadAt: "desc",
                },
                {
                    storyId: "desc",
                },
            ],
            take: limit + 1,
            ...(cursor
                ? {
                      cursor: {
                          userId_storyId: {
                              userId,
                              storyId: cursor,
                          },
                      },
                      skip: 1,
                  }
                : {}),
            select: {
                storyId: true,
                progress: true,
                lastReadAt: true,
                chapter: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                story: {
                    select: storySummarySelect,
                },
            },
        });

        const page = buildCursorPage(rows, limit, (row) => row.storyId);

        return {
            items: page.items.map(({ storyId: _storyId, ...item }) => item),
            pagination: page.pagination,
        };
    }

    public async deleteProgress(
        userId: string,
        storyId: string,
    ): Promise<void> {
        await prisma.readingProgress.deleteMany({
            where: {
                userId,
                storyId,
            },
        });
    }
}
