import { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../../db/index.js";
import { buildCursorPage } from "../../../shared/pagination/page.js";
import { isPrismaErrorCode } from "../../../utils/prisma-error.js";
import { isAtLeastAge } from "../../content/policy/mature.policy.js";

import type { LibraryStore } from "../application/reading.ports.js";
import { ReadingListNameConflictError } from "../domain/reading.errors.js";
import {
    readSignalBucket,
    shouldRecordMeaningfulHistory,
} from "../domain/reading-events.js";
import { createHash } from "node:crypto";

const storySummarySelect = {
    id: true,
    slug: true,
    title: true,
    coverUrl: true,
    status: true,
    isMature: true,
    author: {
        select: {
            username: true,
            displayName: true,
        },
    },
} satisfies Prisma.StorySelect;

async function buildVisibleStoryWhere(
    viewerId: string | undefined,
    visibility: Prisma.StoryWhereInput["visibility"] = {
        in: ["PUBLIC", "UNLISTED"],
    },
): Promise<Prisma.StoryWhereInput> {
    if (!viewerId) {
        return {
            deletedAt: null,
            moderationState: "VISIBLE",
            visibility,
            publishedAt: { not: null },
            status: { in: ["ONGOING", "COMPLETED", "HIATUS"] },
            isMature: false,
            author: { status: "ACTIVE" },
        };
    }

    const [viewer, blocks] = await Promise.all([
        prisma.user.findUnique({
            where: { id: viewerId },
            select: {
                birthDate: true,
                preferences: {
                    select: { allowMatureContent: true },
                },
            },
        }),
        prisma.block.findMany({
            where: {
                OR: [{ blockerId: viewerId }, { blockedId: viewerId }],
            },
            select: { blockerId: true, blockedId: true },
        }),
    ]);

    const includeMature =
        viewer !== null &&
        viewer.preferences?.allowMatureContent === true &&
        isAtLeastAge(viewer.birthDate, 18, new Date());
    const blockedIds = blocks.map((block) =>
        block.blockerId === viewerId ? block.blockedId : block.blockerId,
    );

    return {
        deletedAt: null,
        moderationState: "VISIBLE",
        visibility,
        publishedAt: { not: null },
        status: { in: ["ONGOING", "COMPLETED", "HIATUS"] },
        ...(includeMature ? {} : { isMature: false }),
        ...(blockedIds.length > 0 ? { authorId: { notIn: blockedIds } } : {}),
        author: { status: "ACTIVE" },
    };
}

const listSelect = {
    id: true,
    name: true,
    description: true,
    isPublic: true,
    createdAt: true,
    updatedAt: true,
    _count: {
        select: {
            items: true,
        },
    },
} satisfies Prisma.ReadingListSelect;

function mapList(row: {
    id: string;
    name: string;
    description: string | null;
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
    _count: {
        items: number;
    };
}) {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        isPublic: row.isPublic,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        itemCount: row._count.items,
    };
}

export class PrismaReadingStore implements LibraryStore {
    public async addLibraryEntry(
        userId: string,
        storyId: string,
    ): Promise<void> {
        await prisma.libraryEntry.upsert({
            where: {
                userId_storyId: {
                    userId,
                    storyId,
                },
            },
            create: {
                userId,
                storyId,
            },
            update: {},
        });
    }

    public async removeLibraryEntry(
        userId: string,
        storyId: string,
    ): Promise<void> {
        await prisma.libraryEntry.deleteMany({
            where: {
                userId,
                storyId,
            },
        });
    }

    public async hasLibraryEntry(
        userId: string,
        storyId: string,
    ): Promise<boolean> {
        const entry = await prisma.libraryEntry.findUnique({
            where: {
                userId_storyId: {
                    userId,
                    storyId,
                },
            },
            select: {
                storyId: true,
            },
        });

        return entry !== null;
    }

    public async listLibrary(
        userId: string,
        cursor: string | undefined,
        limit: number,
    ) {
        const visibleStoryWhere = await buildVisibleStoryWhere(userId);
        const rows = await prisma.libraryEntry.findMany({
            where: {
                userId,
                story: visibleStoryWhere,
            },
            orderBy: [{ addedAt: "desc" }, { storyId: "desc" }],
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
                addedAt: true,
                storyId: true,
                story: {
                    select: storySummarySelect,
                },
            },
        });

        const page = buildCursorPage(rows, limit, (row) => row.storyId);

        return {
            entries: page.items.map((row) => ({
                addedAt: row.addedAt,
                story: row.story,
            })),
            pagination: page.pagination,
        };
    }

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

    public async createReadingList(
        userId: string,
        name: string,
        description: string | undefined,
        isPublic: boolean,
    ) {
        try {
            const row = await prisma.readingList.create({
                data: {
                    userId,
                    name,
                    ...(description
                        ? {
                              description,
                          }
                        : {}),
                    isPublic,
                },
                select: listSelect,
            });

            return mapList(row);
        } catch (error) {
            if (isPrismaErrorCode(error, "P2002")) {
                throw new ReadingListNameConflictError();
            }

            throw error;
        }
    }

    public async updateReadingList(
        userId: string,
        listId: string,
        input: {
            name?: string;
            description?: string | null;
            isPublic?: boolean;
        },
    ) {
        try {
            const updated = await prisma.readingList.updateMany({
                where: {
                    id: listId,
                    userId,
                },
                data: input,
            });

            if (updated.count !== 1) {
                return null;
            }

            const row = await prisma.readingList.findUnique({
                where: {
                    id: listId,
                },
                select: listSelect,
            });

            return row ? mapList(row) : null;
        } catch (error) {
            if (isPrismaErrorCode(error, "P2002")) {
                throw new ReadingListNameConflictError();
            }

            throw error;
        }
    }

    public async deleteReadingList(
        userId: string,
        listId: string,
    ): Promise<boolean> {
        const result = await prisma.readingList.deleteMany({
            where: {
                id: listId,
                userId,
            },
        });

        return result.count === 1;
    }

    public async listOwnReadingLists(userId: string) {
        const rows = await prisma.readingList.findMany({
            where: {
                userId,
            },
            orderBy: [
                {
                    updatedAt: "desc",
                },
                {
                    id: "desc",
                },
            ],
            select: listSelect,
        });

        return rows.map(mapList);
    }

    public async listPublicReadingLists(userId: string, viewerId?: string) {
        const rows = await prisma.readingList.findMany({
            where: {
                userId,
                isPublic: true,
                user: {
                    status: "ACTIVE",
                    ...(viewerId
                        ? {
                              blocksCreated: { none: { blockedId: viewerId } },
                              blocksReceived: { none: { blockerId: viewerId } },
                          }
                        : {}),
                },
            },
            orderBy: [
                {
                    updatedAt: "desc",
                },
                {
                    id: "desc",
                },
            ],
            select: listSelect,
        });

        return rows.map(mapList);
    }

    public async getReadingList(listId: string, viewerId: string | undefined) {
        const list = await prisma.readingList.findFirst({
            where: {
                id: listId,
                OR: [
                    {
                        isPublic: true,
                    },
                    ...(viewerId
                        ? [
                              {
                                  userId: viewerId,
                              },
                          ]
                        : []),
                ],
                user: {
                    status: "ACTIVE",
                    ...(viewerId
                        ? {
                              blocksCreated: { none: { blockedId: viewerId } },
                              blocksReceived: { none: { blockerId: viewerId } },
                          }
                        : {}),
                },
            },
            select: {
                ...listSelect,
                userId: true,
                user: {
                    select: {
                        username: true,
                        displayName: true,
                    },
                },
            },
        });

        if (!list) {
            return null;
        }

        const isOwner = viewerId !== undefined && viewerId === list.userId;

        const readableStoryWhere = await buildVisibleStoryWhere(
            viewerId,
            isOwner ? { in: ["PUBLIC", "UNLISTED"] } : "PUBLIC",
        );

        const items = await prisma.readingListItem.findMany({
            where: {
                readingListId: listId,
                story: readableStoryWhere,
            },
            orderBy: [{ position: "asc" }, { storyId: "asc" }],
            select: {
                addedAt: true,
                story: {
                    select: storySummarySelect,
                },
            },
        });

        return {
            list: {
                ...mapList(list),
                owner: list.user,
            },
            items,
        };
    }

    public async addReadingListItem(
        userId: string,
        listId: string,
        storyId: string,
    ): Promise<boolean> {
        return prisma.$transaction(async (transaction) => {
            await transaction.$queryRaw`
                SELECT pg_advisory_xact_lock(hashtextextended(${listId}, 2))
            `;
            const owner = await transaction.readingList.findFirst({
                where: { id: listId, userId },
                select: { id: true },
            });
            if (!owner) return false;
            const aggregate = await transaction.readingListItem.aggregate({
                where: { readingListId: listId },
                _max: { position: true },
            });
            await transaction.readingListItem.upsert({
                where: {
                    readingListId_storyId: { readingListId: listId, storyId },
                },
                create: {
                    readingListId: listId,
                    storyId,
                    position: (aggregate._max.position ?? 0) + 1,
                },
                update: {},
            });
            return true;
        });
    }

    public async removeReadingListItem(
        userId: string,
        listId: string,
        storyId: string,
    ): Promise<boolean> {
        const owner = await prisma.readingList.findFirst({
            where: {
                id: listId,
                userId,
            },
            select: {
                id: true,
            },
        });

        if (!owner) {
            return false;
        }

        await prisma.readingListItem.deleteMany({
            where: {
                readingListId: listId,
                storyId,
            },
        });

        return true;
    }

    public async reorderReadingListItems(
        userId: string,
        listId: string,
        storyIds: string[],
        expectedOrderingVersion: number,
    ) {
        return prisma.$transaction(async (transaction) => {
            await transaction.$queryRaw`
                SELECT pg_advisory_xact_lock(hashtextextended(${listId}, 2))
            `;
            const list = await transaction.readingList.findFirst({
                where: {
                    id: listId,
                    userId,
                    orderingVersion: expectedOrderingVersion,
                },
                select: { id: true },
            });
            if (!list) return null;
            const existing = await transaction.readingListItem.findMany({
                where: { readingListId: listId },
                select: { storyId: true },
            });
            const expected = new Set(storyIds);
            if (
                existing.length !== storyIds.length ||
                existing.some((item) => !expected.has(item.storyId))
            )
                return null;

            await transaction.$executeRaw`
                SET CONSTRAINTS "reading_list_items_reading_list_id_position_key" DEFERRED
            `;
            if (storyIds.length > 0) {
                const positions = storyIds.map(
                    (storyId, index) =>
                        Prisma.sql`(${storyId}::uuid, ${index + 1}::integer)`,
                );
                await transaction.$executeRaw(Prisma.sql`
                    UPDATE "reading_list_items" AS item
                    SET "position" = ordered."position"
                    FROM (VALUES ${Prisma.join(positions)}) AS ordered("story_id", "position")
                    WHERE item."reading_list_id" = ${listId}::uuid
                      AND item."story_id" = ordered."story_id"
                `);
            }
            const updated = await transaction.readingList.updateMany({
                where: { id: listId, orderingVersion: expectedOrderingVersion },
                data: { orderingVersion: { increment: 1 } },
            });
            return updated.count === 1
                ? { orderingVersion: expectedOrderingVersion + 1 }
                : null;
        });
    }
}
