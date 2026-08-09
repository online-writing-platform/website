import type { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../../db/index.js";
import { buildCursorPage } from "../../../shared/pagination/page.js";
import { isPrismaErrorCode } from "../../../utils/prisma-error.js";
import { isAtLeastAge } from "../../stories/domain/mature.policy.js";

import type { LibraryStore } from "../application/library.ports.js";
import { ReadingListNameConflictError } from "../domain/library.errors.js";

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
            status: { not: "DRAFT" },
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
        status: { not: "DRAFT" },
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

export class PrismaLibraryStore implements LibraryStore {
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
            orderBy: [
                {
                    addedAt: "desc",
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
                addedAt: true,
                storyId: true,
                story: {
                    select: storySummarySelect,
                },
            },
        });

        const page = buildCursorPage(
            rows,
            limit,
            (row) => row.storyId,
        );

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
        readAt: Date,
    ) {
        await prisma.readingProgress.upsert({
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
                lastReadAt: readAt,
            },
            update: {
                chapterId: chapterId ?? null,
                progress,
                lastReadAt: readAt,
            },
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

        const page = buildCursorPage(
            rows,
            limit,
            (row) => row.storyId,
        );

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

    public async listPublicReadingLists(
        userId: string,
        viewerId?: string,
    ) {
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

    public async getReadingList(
        listId: string,
        viewerId: string | undefined,
    ) {
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
            orderBy: [
                {
                    addedAt: "desc",
                },
                {
                    storyId: "desc",
                },
            ],
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

        await prisma.readingListItem.upsert({
            where: {
                readingListId_storyId: {
                    readingListId: listId,
                    storyId,
                },
            },
            create: {
                readingListId: listId,
                storyId,
            },
            update: {},
        });

        return true;
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
}
