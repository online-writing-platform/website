import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../db/index.js";
import { isPrismaErrorCode } from "../../utils/prisma-error.js";
import { ReadingListNameConflictError } from "./reading.errors.js";
import { buildVisibleStoryWhere, storySummarySelect } from "./reading.visibility.js";

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


export class ReadingListsRepository {
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
