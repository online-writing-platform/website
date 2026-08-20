import { prisma } from "../../db/index.js";
import { isAtLeastAge } from "./stories.policy.js";
import type { ChapterView, CreateStoryInput, StoryDetail, StorySummary, UpdateStoryInput } from "./stories.types.js";

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

export class StoriesRepository {
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
                    ...(input.coverUrl !== undefined
                        ? { coverUrl: input.coverUrl }
                        : {}),
                    ...(input.language !== undefined
                        ? { language: input.language }
                        : {}),
                    ...(input.rights !== undefined
                        ? { rights: input.rights }
                        : {}),
                    ...(input.isMature !== undefined
                        ? { isMature: input.isMature }
                        : {}),
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
                    ...(input.title !== undefined
                        ? { title: input.title }
                        : {}),
                    ...(input.description !== undefined
                        ? { description: input.description }
                        : {}),
                    ...(input.coverUrl !== undefined
                        ? { coverUrl: input.coverUrl }
                        : {}),
                    ...(input.language !== undefined
                        ? { language: input.language }
                        : {}),
                    ...(input.rights !== undefined
                        ? { rights: input.rights }
                        : {}),
                    ...(input.isMature !== undefined
                        ? { isMature: input.isMature }
                        : {}),
                    ...(input.status !== undefined
                        ? { status: input.status }
                        : {}),
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

                    status:
                        story.status === "DRAFT" || story.status === "SCHEDULED"
                            ? "ONGOING"
                            : story.status,

                    ...(story.publishedAt === null ? { publishedAt } : {}),
                },
            });

            return "PUBLISHED";
        });
    }

    public async unpublishStory(
        authorId: string,
        storyId: string,
    ): Promise<boolean> {
        const result = await prisma.story.updateMany({
            where: { id: storyId, authorId, deletedAt: null },
            data: { visibility: "PRIVATE" },
        });

        return result.count === 1;
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
}
