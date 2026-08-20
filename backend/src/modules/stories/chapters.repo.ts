import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../db/index.js";
import { isPrismaErrorCode } from "../../utils/prisma-error.js";
import { isAtLeastAge, chapterContentHash, shouldCreateDraftRevision } from "./stories.policy.js";
import type { ChapterView, CreateChapterInput, UpdateChapterInput } from "./stories.types.js";
interface ChapterRow {
    id: string;
    title: string;
    position: number;
    content?: string;
    version: number;
    status: "DRAFT" | "SCHEDULED" | "PUBLISHED";
    moderationState: "VISIBLE" | "HIDDEN" | "REMOVED";
    wordCount: number;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const chapterMetadataSelect = {
    id: true,
    title: true,
    position: true,
    version: true,
    status: true,
    moderationState: true,
    wordCount: true,
    publishedAt: true,
    createdAt: true,
    updatedAt: true,
} as const;

const chapterContentSelect = {
    ...chapterMetadataSelect,
    content: true,
} as const;

function mapChapter(row: ChapterRow): ChapterView {
    return {
        id: row.id,
        title: row.title,
        position: row.position,
        ...(row.content !== undefined ? { content: row.content } : {}),
        version: row.version,
        status: row.status,
        moderationState: row.moderationState,
        wordCount: row.wordCount,
        publishedAt: row.publishedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

async function viewerCanReadMatureContent(
    viewerId: string | undefined,
): Promise<boolean> {
    if (!viewerId) return false;

    const viewer = await prisma.user.findUnique({
        where: { id: viewerId },
        select: {
            birthDate: true,
            status: true,
            preferences: {
                select: { allowMatureContent: true },
            },
        },
    });

    if (
        !viewer ||
        viewer.status !== "ACTIVE" ||
        viewer.preferences?.allowMatureContent !== true
    ) {
        return false;
    }

    return isAtLeastAge(viewer.birthDate, 18, new Date());
}

export class ChaptersRepository {
    public async createChapter(
        authorId: string,
        storyId: string,
        input: CreateChapterInput,
        wordCount: number,
    ): Promise<ChapterView | null> {
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                const row: ChapterRow | null = await prisma.$transaction(
                    async (transaction) => {
                        const story = await transaction.story.findFirst({
                            where: { id: storyId, authorId, deletedAt: null },
                            select: { id: true },
                        });

                        if (!story) {
                            return null;
                        }

                        const aggregate = await transaction.chapter.aggregate({
                            where: { storyId, deletedAt: null },
                            _max: { position: true },
                        });

                        return transaction.chapter.create({
                            data: {
                                storyId,
                                title: input.title,
                                content: input.content,
                                contentHash: chapterContentHash(
                                    input.title,
                                    input.content,
                                ),
                                wordCount,
                                position: (aggregate._max.position ?? 0) + 1,
                            },
                            select: chapterContentSelect,
                        });
                    },
                );

                return row ? mapChapter(row) : null;
            } catch (error) {
                if (attempt < 2 && isPrismaErrorCode(error, "P2002")) {
                    continue;
                }

                throw error;
            }
        }

        throw new Error("Failed to allocate chapter position.");
    }

    public async updateChapter(
        authorId: string,
        storyId: string,
        chapterId: string,
        input: UpdateChapterInput,
        wordCount: number | undefined,
    ) {
        return prisma.$transaction(async (transaction) => {
            await transaction.$queryRaw`
                SELECT pg_advisory_xact_lock(hashtextextended(${chapterId}, 1))
            `;
            const current = await transaction.chapter.findFirst({
                where: {
                    id: chapterId,
                    storyId,
                    deletedAt: null,
                    story: { authorId, deletedAt: null },
                },
                select: {
                    ...chapterContentSelect,
                    contentHash: true,
                    revisions: {
                        orderBy: { revisionNumber: "desc" },
                        take: 1,
                        select: { revisionNumber: true, createdAt: true },
                    },
                },
            });
            if (!current) return null;
            if (current.version !== input.expectedVersion) {
                return {
                    kind: "CONFLICT" as const,
                    current: mapChapter(current),
                };
            }

            const nextTitle = input.title ?? current.title;
            const nextContent = input.content ?? current.content;
            const currentHash =
                current.contentHash ||
                chapterContentHash(current.title, current.content);
            const incomingHash = chapterContentHash(nextTitle, nextContent);
            const lastRevision = current.revisions.at(0);
            if (
                shouldCreateDraftRevision({
                    currentHash,
                    incomingHash,
                    lastRevisionAt: lastRevision?.createdAt ?? null,
                    now: new Date(),
                    minimumIntervalMs: 5 * 60_000,
                })
            ) {
                await transaction.chapterRevision.create({
                    data: {
                        chapterId,
                        createdBy: authorId,
                        revisionNumber: (lastRevision?.revisionNumber ?? 0) + 1,
                        sourceVersion: current.version,
                        title: current.title,
                        content: current.content,
                        contentHash: currentHash,
                        wordCount: current.wordCount,
                        reason: "CHECKPOINT",
                    },
                });
            }

            const row = await transaction.chapter.update({
                where: { id: chapterId },
                data: {
                    ...(input.title !== undefined
                        ? { title: input.title }
                        : {}),
                    ...(input.content !== undefined
                        ? { content: input.content }
                        : {}),
                    ...(wordCount !== undefined ? { wordCount } : {}),
                    contentHash: incomingHash,
                    version: { increment: 1 },
                },
                select: chapterContentSelect,
            });
            return { kind: "UPDATED" as const, chapter: mapChapter(row) };
        });
    }

    public async softDeleteChapter(
        authorId: string,
        storyId: string,
        chapterId: string,
        deletedAt: Date,
    ): Promise<boolean> {
        const result = await prisma.chapter.updateMany({
            where: {
                id: chapterId,
                storyId,
                deletedAt: null,
                story: { authorId, deletedAt: null },
            },
            data: {
                deletedAt,
                status: "DRAFT",
                publishedAt: null,
            },
        });

        return result.count === 1;
    }

    public async publishChapter(
        authorId: string,
        storyId: string,
        chapterId: string,
        publishedAt: Date,
    ): Promise<ChapterView | "EMPTY" | null> {
        return prisma.$transaction(async (transaction) => {
            const current = await transaction.chapter.findFirst({
                where: {
                    id: chapterId,
                    storyId,
                    deletedAt: null,
                    story: {
                        authorId,
                        deletedAt: null,
                    },
                },
                select: {
                    wordCount: true,
                },
            });

            if (!current) {
                return null;
            }

            if (current.wordCount === 0) {
                return "EMPTY";
            }

            const row: ChapterRow = await transaction.chapter.update({
                where: {
                    id: chapterId,
                },
                data: {
                    status: "PUBLISHED",
                    publishedAt,
                },
                select: chapterContentSelect,
            });

            await transaction.outboxMessage.create({
                data: {
                    eventType: "CHAPTER_PUBLISHED",

                    aggregateType: "CHAPTER",

                    aggregateId: chapterId,

                    payload: {
                        chapterId,

                        publishedAt: publishedAt.toISOString(),
                    },
                },
            });

            return mapChapter(row);
        });
    }

    public async unpublishChapter(
        authorId: string,
        storyId: string,
        chapterId: string,
    ): Promise<ChapterView | null> {
        const updated = await prisma.chapter.updateMany({
            where: {
                id: chapterId,
                storyId,
                deletedAt: null,
                story: { authorId, deletedAt: null },
            },
            data: {
                status: "DRAFT",
                publishedAt: null,
            },
        });

        if (updated.count !== 1) {
            return null;
        }

        const row: ChapterRow | null = await prisma.chapter.findUnique({
            where: { id: chapterId },
            select: chapterContentSelect,
        });

        return row ? mapChapter(row) : null;
    }

    public async reorderChapters(
        authorId: string,
        storyId: string,
        chapterIds: string[],
        expectedOrderingVersion: number,
    ): Promise<ChapterView[] | null> {
        return prisma.$transaction(async (transaction) => {
            await transaction.$queryRaw`
                SELECT pg_advisory_xact_lock(hashtextextended(${storyId}, 0))
            `;
            const story = await transaction.story.findFirst({
                where: {
                    id: storyId,
                    authorId,
                    deletedAt: null,
                    orderingVersion: expectedOrderingVersion,
                },
                select: { id: true, orderingVersion: true },
            });
            if (!story) return null;

            const existing = await transaction.chapter.findMany({
                where: { storyId, deletedAt: null },
                orderBy: { position: "asc" },
                select: { id: true },
            });

            const requestedIds = new Set(chapterIds);
            if (
                existing.length !== chapterIds.length ||
                existing.some((chapter) => !requestedIds.has(chapter.id))
            ) {
                return null;
            }

            await transaction.$executeRaw`
                SET CONSTRAINTS "chapters_story_id_position_key" DEFERRED
            `;
            if (chapterIds.length > 0) {
                const positions = chapterIds.map(
                    (chapterId, index) =>
                        Prisma.sql`(${chapterId}::uuid, ${index + 1}::integer)`,
                );
                await transaction.$executeRaw(Prisma.sql`
                    UPDATE "chapters" AS chapter
                    SET "position" = ordered."position"
                    FROM (VALUES ${Prisma.join(positions)}) AS ordered("id", "position")
                    WHERE chapter."id" = ordered."id"
                      AND chapter."story_id" = ${storyId}::uuid
                      AND chapter."deleted_at" IS NULL
                `);
            }
            const versionUpdate = await transaction.story.updateMany({
                where: {
                    id: storyId,
                    orderingVersion: expectedOrderingVersion,
                },
                data: { orderingVersion: { increment: 1 } },
            });
            if (versionUpdate.count !== 1) return null;

            const rows: ChapterRow[] = await transaction.chapter.findMany({
                where: { storyId, deletedAt: null },
                orderBy: { position: "asc" },
                select: chapterMetadataSelect,
            });
            return rows.map(mapChapter);
        });
    }

    public async getPublicChapter(
        storySlug: string,
        chapterId: string,
        viewerId?: string,
    ): Promise<ChapterView | null> {
        const canReadMature = await viewerCanReadMatureContent(viewerId);

        const row: ChapterRow | null = await prisma.chapter.findFirst({
            where: {
                id: chapterId,
                deletedAt: null,
                status: "PUBLISHED",
                moderationState: "VISIBLE",
                story: {
                    slug: storySlug,
                    deletedAt: null,
                    moderationState: "VISIBLE",
                    visibility: { in: ["PUBLIC", "UNLISTED"] },
                    publishedAt: { not: null },
                    status: { in: ["ONGOING", "COMPLETED", "HIATUS"] },
                    author: {
                        status: "ACTIVE",
                        ...(viewerId
                            ? {
                                  blocksCreated: {
                                      none: { blockedId: viewerId },
                                  },
                                  blocksReceived: {
                                      none: { blockerId: viewerId },
                                  },
                              }
                            : {}),
                    },
                    ...(canReadMature ? {} : { isMature: false }),
                },
            },
            select: chapterContentSelect,
        });

        return row ? mapChapter(row) : null;
    }

    public async getOwnedChapter(
        authorId: string,
        storyId: string,
        chapterId: string,
    ): Promise<ChapterView | null> {
        const row: ChapterRow | null = await prisma.chapter.findFirst({
            where: {
                id: chapterId,
                storyId,
                deletedAt: null,
                story: { authorId, deletedAt: null },
            },
            select: chapterContentSelect,
        });

        return row ? mapChapter(row) : null;
    }
}
