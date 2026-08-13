import { prisma } from "../../../db/index.js";
import { Prisma } from "../../../generated/prisma/client.js";
import env from "../../../config/env.js";
import { createCursorCodec } from "../../../shared/http/cursor.js";
import { z } from "zod";
import { isPrismaErrorCode } from "../../../utils/prisma-error.js";

import { isAtLeastAge } from "../policy/mature.policy.js";
import {
    chapterContentHash,
    shouldCreateDraftRevision,
} from "../revisions/revision-policy.js";
import type { StoryStore } from "../application/content.ports.js";
import type {
    ChapterView,
    CreateChapterInput,
    CreateStoryInput,
    StoryDetail,
    StoryPage,
    StorySummary,
    UpdateChapterInput,
    UpdateStoryInput,
} from "../catalog/content.types.js";

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

interface StoryRow {
    id: string;
    slug: string;
    title: string;
    description: string;
    coverUrl: string | null;
    language: string;
    rights: "ALL_RIGHTS_RESERVED" | "PUBLIC_DOMAIN" | "CREATIVE_COMMONS";
    status: "DRAFT" | "SCHEDULED" | "ONGOING" | "COMPLETED" | "HIATUS" | "ARCHIVED";
    visibility: "PRIVATE" | "UNLISTED" | "PUBLIC";
    moderationState: "VISIBLE" | "HIDDEN" | "REMOVED";
    isMature: boolean;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    author: {
        username: string;
        displayName: string;
        avatarUrl: string | null;
    };
    genre: {
        slug: string;
        name: string;
    } | null;
    tags: Array<{
        tag: {
            slug: string;
            name: string;
        };
    }>;
}

interface StoryDetailRow extends StoryRow {
    chapters: ChapterRow[];
}

const storyBaseSelect = {
    id: true,
    slug: true,
    title: true,
    description: true,
    coverUrl: true,
    language: true,
    rights: true,
    status: true,
    visibility: true,
    moderationState: true,
    isMature: true,
    publishedAt: true,
    createdAt: true,
    updatedAt: true,
    author: {
        select: {
            username: true,
            displayName: true,
            avatarUrl: true,
        },
    },
    genre: {
        select: {
            slug: true,
            name: true,
        },
    },
    tags: {
        orderBy: {
            tag: {
                slug: "asc" as const,
            },
        },
        select: {
            tag: {
                select: {
                    slug: true,
                    name: true,
                },
            },
        },
    },
} as const;

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

const cursorCodec = createCursorCodec(env.cursorSecret);
const dateIdCursorSchema = z.object({ at: z.string().datetime(), id: z.string().uuid() });

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

function mapSummary(row: StoryRow): StorySummary {
    return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: row.description,
        coverUrl: row.coverUrl,
        language: row.language,
        rights: row.rights,
        status: row.status,
        visibility: row.visibility,
        moderationState: row.moderationState,
        isMature: row.isMature,
        publishedAt: row.publishedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        author: row.author,
        genre: row.genre,
        tags: row.tags.map(({ tag }) => tag),
    };
}

function mapDetail(row: StoryDetailRow): StoryDetail {
    return {
        ...mapSummary(row),
        chapters: row.chapters.map(mapChapter),
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

export class PrismaContentStore implements StoryStore {
    public async createStory(
        authorId: string,
        slug: string,
        input: CreateStoryInput,
        tagNames: Array<{ name: string; slug: string }>,
    ): Promise<StoryDetail> {
        const genre = input.genreSlug
            ? await prisma.genre.findFirst({
                  where: { slug: input.genreSlug, isActive: true },
                  select: { id: true },
              })
            : null;

        const storyId = await prisma.$transaction(async (transaction) => {
            const story = await transaction.story.create({
                data: {
                    authorId,
                    slug,
                    title: input.title,
                    description: input.description,
                    ...(input.coverUrl !== undefined ? { coverUrl: input.coverUrl } : {}),
                    ...(input.language !== undefined ? { language: input.language } : {}),
                    ...(input.rights !== undefined ? { rights: input.rights } : {}),
                    ...(input.isMature !== undefined ? { isMature: input.isMature } : {}),
                    ...(genre ? { genreId: genre.id } : {}),
                },
                select: { id: true },
            });

            for (const tagInput of tagNames) {
                const tag = await transaction.tag.upsert({
                    where: { slug: tagInput.slug },
                    update: { name: tagInput.name },
                    create: tagInput,
                    select: { id: true },
                });

                await transaction.storyTag.create({
                    data: {
                        storyId: story.id,
                        tagId: tag.id,
                    },
                });
            }

            return story.id;
        });

        const story = await this.getOwnedStory(authorId, storyId);

        if (!story) {
            throw new Error("Created story could not be loaded.");
        }

        return story;
    }

    public findOwnedStory(authorId: string, storyId: string) {
        return prisma.story.findFirst({
            where: {
                id: storyId,
                authorId,
                deletedAt: null,
            },
            select: {
                id: true,
                authorId: true,
                status: true,
                visibility: true,
                publishedAt: true,
            },
        });
    }

    public async updateStory(
        authorId: string,
        storyId: string,
        input: UpdateStoryInput,
        tagNames?: Array<{ name: string; slug: string }>,
    ): Promise<StoryDetail | null> {
        const genre =
            input.genreSlug === undefined || input.genreSlug === null
                ? null
                : await prisma.genre.findFirst({
                      where: { slug: input.genreSlug, isActive: true },
                      select: { id: true },
                  });

        const updated = await prisma.$transaction(async (transaction) => {
            const result = await transaction.story.updateMany({
                where: {
                    id: storyId,
                    authorId,
                    deletedAt: null,
                },
                data: {
                    ...(input.title !== undefined ? { title: input.title } : {}),
                    ...(input.description !== undefined
                        ? { description: input.description }
                        : {}),
                    ...(input.coverUrl !== undefined ? { coverUrl: input.coverUrl } : {}),
                    ...(input.language !== undefined ? { language: input.language } : {}),
                    ...(input.rights !== undefined ? { rights: input.rights } : {}),
                    ...(input.isMature !== undefined ? { isMature: input.isMature } : {}),
                    ...(input.status !== undefined ? { status: input.status } : {}),
                    ...(input.visibility !== undefined
                        ? { visibility: input.visibility }
                        : {}),
                    ...(input.genreSlug === null
                        ? { genreId: null }
                        : input.genreSlug !== undefined && genre
                          ? { genreId: genre.id }
                          : {}),
                },
            });

            if (result.count !== 1) {
                return false;
            }

            if (tagNames !== undefined) {
                await transaction.storyTag.deleteMany({ where: { storyId } });

                for (const tagInput of tagNames) {
                    const tag = await transaction.tag.upsert({
                        where: { slug: tagInput.slug },
                        update: { name: tagInput.name },
                        create: tagInput,
                        select: { id: true },
                    });

                    await transaction.storyTag.create({
                        data: {
                            storyId,
                            tagId: tag.id,
                        },
                    });
                }
            }

            return true;
        });

        return updated ? this.getOwnedStory(authorId, storyId) : null;
    }

    public async softDeleteStory(
        authorId: string,
        storyId: string,
        deletedAt: Date,
    ): Promise<boolean> {
        const result = await prisma.story.updateMany({
            where: { id: storyId, authorId, deletedAt: null },
            data: {
                deletedAt,
                visibility: "PRIVATE",
            },
        });

        return result.count === 1;
    }

    public async publishStory(
        authorId: string,
        storyId: string,
        publishedAt: Date,
    ): Promise<"PUBLISHED" | "NOT_FOUND" | "NO_PUBLISHED_CHAPTER"> {
        return prisma.$transaction(async (transaction) => {
            const story = await transaction.story.findFirst({
                where: { id: storyId, authorId, deletedAt: null },
                select: { status: true, publishedAt: true },
            });

            if (!story) {
                return "NOT_FOUND";
            }

            const publishedChapterCount = await transaction.chapter.count({
                where: {
                    storyId,
                    deletedAt: null,
                    status: "PUBLISHED",
                    moderationState: "VISIBLE",
                },
            });

            if (publishedChapterCount === 0) {
                return "NO_PUBLISHED_CHAPTER";
            }

            await transaction.story.update({
                where: { id: storyId },
                data: {
                    visibility: "PUBLIC",
                    status: story.status === "DRAFT" ? "ONGOING" : story.status,
                    ...(story.publishedAt === null ? { publishedAt } : {}),
                },
            });

            return "PUBLISHED";
        });
    }

    public async unpublishStory(authorId: string, storyId: string): Promise<boolean> {
        const result = await prisma.story.updateMany({
            where: { id: storyId, authorId, deletedAt: null },
            data: { visibility: "PRIVATE" },
        });

        return result.count === 1;
    }

    public async findReadableStoryById(
        storyId: string,
        viewerId?: string,
    ) {
        const canReadMature = await viewerCanReadMatureContent(viewerId);

        return prisma.story.findFirst({
            where: {
                id: storyId,
                deletedAt: null,
                moderationState: "VISIBLE",
                visibility: { in: ["PUBLIC", "UNLISTED"] },
                publishedAt: { not: null },
                status: { in: ["ONGOING", "COMPLETED", "HIATUS"] },
                author: {
                    status: "ACTIVE",
                    ...(viewerId
                        ? {
                              blocksCreated: { none: { blockedId: viewerId } },
                              blocksReceived: { none: { blockerId: viewerId } },
                          }
                        : {}),
                },
                ...(canReadMature ? {} : { isMature: false }),
            },
            select: {
                id: true,
                slug: true,
                authorId: true,
                title: true,
            },
        });
    }

    public async findReadableChapterById(
        chapterId: string,
        viewerId?: string,
    ) {
        const canReadMature = await viewerCanReadMatureContent(viewerId);

        const row = await prisma.chapter.findFirst({
            where: {
                id: chapterId,
                deletedAt: null,
                moderationState: "VISIBLE",
                status: "PUBLISHED",
                publishedAt: { not: null },
                story: {
                    deletedAt: null,
                    moderationState: "VISIBLE",
                    visibility: { in: ["PUBLIC", "UNLISTED"] },
                    publishedAt: { not: null },
                    status: { in: ["ONGOING", "COMPLETED", "HIATUS"] },
                    author: {
                        status: "ACTIVE",
                        ...(viewerId
                            ? {
                                  blocksCreated: { none: { blockedId: viewerId } },
                                  blocksReceived: { none: { blockerId: viewerId } },
                              }
                            : {}),
                    },
                    ...(canReadMature ? {} : { isMature: false }),
                },
            },
            select: {
                id: true,
                storyId: true,
                title: true,
                story: {
                    select: {
                        slug: true,
                        title: true,
                        authorId: true,
                    },
                },
            },
        });

        return row
            ? {
                  id: row.id,
                  storyId: row.storyId,
                  storySlug: row.story.slug,
                  storyTitle: row.story.title,
                  authorId: row.story.authorId,
                  title: row.title,
              }
            : null;
    }

    public async getPublicStory(
        slug: string,
        viewerId?: string,
    ): Promise<StoryDetail | null> {
        const canReadMature = await viewerCanReadMatureContent(viewerId);
        const row: StoryDetailRow | null = await prisma.story.findFirst({
            where: {
                slug,
                deletedAt: null,
                moderationState: "VISIBLE",
                visibility: { in: ["PUBLIC", "UNLISTED"] },
                publishedAt: { not: null },
                status: { in: ["ONGOING", "COMPLETED", "HIATUS"] },
                ...(canReadMature ? {} : { isMature: false }),
                author: {
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
                ...storyBaseSelect,
                chapters: {
                    where: {
                        deletedAt: null,
                        status: "PUBLISHED",
                        moderationState: "VISIBLE",
                    },
                    orderBy: { position: "asc" },
                    select: chapterMetadataSelect,
                },
            },
        });

        return row ? mapDetail(row) : null;
    }

    public async getOwnedStory(
        authorId: string,
        storyId: string,
    ): Promise<StoryDetail | null> {
        const row: StoryDetailRow | null = await prisma.story.findFirst({
            where: {
                id: storyId,
                authorId,
                deletedAt: null,
            },
            select: {
                ...storyBaseSelect,
                chapters: {
                    where: { deletedAt: null },
                    orderBy: { position: "asc" },
                    select: chapterMetadataSelect,
                },
            },
        });

        return row ? mapDetail(row) : null;
    }

    public async listPublicStories(
        cursor: string | undefined,
        limit: number,
        filters: { genre?: string; tag?: string; language?: string; author?: string },
        viewerId?: string,
    ): Promise<StoryPage> {
        const canReadMature = await viewerCanReadMatureContent(viewerId);
        const decodedCursor = cursor ? cursorCodec.decode(cursor, dateIdCursorSchema) : null;
        const rows: StoryRow[] = await prisma.story.findMany({
            where: {
                deletedAt: null,
                moderationState: "VISIBLE",
                visibility: "PUBLIC",
                publishedAt: { not: null },
                status: { in: ["ONGOING", "COMPLETED", "HIATUS"] },
                ...(canReadMature ? {} : { isMature: false }),
                author: {
                    status: "ACTIVE",
                    ...(filters.author ? { usernameNormalized: filters.author } : {}),
                    ...(viewerId
                        ? {
                              blocksCreated: { none: { blockedId: viewerId } },
                              blocksReceived: { none: { blockerId: viewerId } },
                          }
                        : {}),
                },
                ...(filters.genre ? { genre: { slug: filters.genre, isActive: true } } : {}),
                ...(filters.tag ? { tags: { some: { tag: { slug: filters.tag } } } } : {}),
                ...(filters.language ? { language: filters.language } : {}),
                ...(decodedCursor
                    ? {
                          OR: [
                              { publishedAt: { lt: new Date(decodedCursor.at) } },
                              {
                                  publishedAt: new Date(decodedCursor.at),
                                  id: { lt: decodedCursor.id },
                              },
                          ],
                      }
                    : {}),
            },
            orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
            take: limit + 1,
            select: storyBaseSelect,
        });
        const hasMore = rows.length > limit;
        const pageRows = rows.slice(0, limit);
        const last = pageRows.at(-1);
        return {
            stories: pageRows.map(mapSummary),
            pagination: {
                hasMore,
                nextCursor:
                    hasMore && last?.publishedAt
                        ? cursorCodec.encode({ at: last.publishedAt.toISOString(), id: last.id })
                        : null,
            },
        };
    }

    public async listOwnedStories(
        authorId: string,
        cursor: string | undefined,
        limit: number,
    ): Promise<StoryPage> {
        const decodedCursor = cursor ? cursorCodec.decode(cursor, dateIdCursorSchema) : null;
        const rows: StoryRow[] = await prisma.story.findMany({
            where: {
                authorId,
                deletedAt: null,
                ...(decodedCursor
                    ? {
                          OR: [
                              { updatedAt: { lt: new Date(decodedCursor.at) } },
                              { updatedAt: new Date(decodedCursor.at), id: { lt: decodedCursor.id } },
                          ],
                      }
                    : {}),
            },
            orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
            take: limit + 1,
            select: storyBaseSelect,
        });
        const hasMore = rows.length > limit;
        const pageRows = rows.slice(0, limit);
        const last = pageRows.at(-1);
        return {
            stories: pageRows.map(mapSummary),
            pagination: {
                hasMore,
                nextCursor: hasMore && last
                    ? cursorCodec.encode({ at: last.updatedAt.toISOString(), id: last.id })
                    : null,
            },
        };
    }

    public listGenres(): Promise<Array<{ slug: string; name: string }>> {
        return prisma.genre.findMany({
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: { slug: true, name: true },
        });
    }

    public async genreExists(slug: string): Promise<boolean> {
        const genre = await prisma.genre.findFirst({
            where: { slug, isActive: true },
            select: { id: true },
        });

        return genre !== null;
    }

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
                                contentHash: chapterContentHash(input.title, input.content),
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
                return { kind: "CONFLICT" as const, current: mapChapter(current) };
            }

            const nextTitle = input.title ?? current.title;
            const nextContent = input.content ?? current.content;
            const currentHash = current.contentHash || chapterContentHash(current.title, current.content);
            const incomingHash = chapterContentHash(nextTitle, nextContent);
            const lastRevision = current.revisions.at(0);
            if (shouldCreateDraftRevision({
                currentHash,
                incomingHash,
                lastRevisionAt: lastRevision?.createdAt ?? null,
                now: new Date(),
                minimumIntervalMs: 5 * 60_000,
            })) {
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
                    ...(input.title !== undefined ? { title: input.title } : {}),
                    ...(input.content !== undefined ? { content: input.content } : {}),
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
        const current = await prisma.chapter.findFirst({
            where: {
                id: chapterId,
                storyId,
                deletedAt: null,
                story: { authorId, deletedAt: null },
            },
            select: { wordCount: true },
        });

        if (!current) {
            return null;
        }

        if (current.wordCount === 0) {
            return "EMPTY";
        }

        const row: ChapterRow = await prisma.chapter.update({
            where: { id: chapterId },
            data: {
                status: "PUBLISHED",
                publishedAt,
            },
            select: chapterContentSelect,
        });

        return mapChapter(row);
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
                const positions = chapterIds.map((chapterId, index) =>
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
                                  blocksCreated: { none: { blockedId: viewerId } },
                                  blocksReceived: { none: { blockerId: viewerId } },
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
