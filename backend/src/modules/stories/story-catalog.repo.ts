import env from "../../config/env.js";
import { prisma } from "../../db/index.js";
import { createCursorCodec } from "../../shared/http/cursor.js";
import { z } from "zod";
import { isAtLeastAge } from "./stories.policy.js";
import type { StoryPage, StorySummary } from "./stories.types.js";

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

const cursorCodec = createCursorCodec(env.cursorSecret);

const dateIdCursorSchema = z.object({ at: z.string().datetime(), id: z.string().uuid() });

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

export class StoryCatalogRepository {
    public async listPublicStories(
        cursor: string | undefined,
        limit: number,
        filters: {
            genre?: string;
            tag?: string;
            language?: string;
            author?: string;
        },
        viewerId?: string,
    ): Promise<StoryPage> {
        const canReadMature = await viewerCanReadMatureContent(viewerId);
        const decodedCursor = cursor
            ? cursorCodec.decode(cursor, dateIdCursorSchema)
            : null;
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
                    ...(filters.author
                        ? { usernameNormalized: filters.author }
                        : {}),
                    ...(viewerId
                        ? {
                              blocksCreated: { none: { blockedId: viewerId } },
                              blocksReceived: { none: { blockerId: viewerId } },
                          }
                        : {}),
                },
                ...(filters.genre
                    ? { genre: { slug: filters.genre, isActive: true } }
                    : {}),
                ...(filters.tag
                    ? { tags: { some: { tag: { slug: filters.tag } } } }
                    : {}),
                ...(filters.language ? { language: filters.language } : {}),
                ...(decodedCursor
                    ? {
                          OR: [
                              {
                                  publishedAt: {
                                      lt: new Date(decodedCursor.at),
                                  },
                              },
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
                        ? cursorCodec.encode({
                              at: last.publishedAt.toISOString(),
                              id: last.id,
                          })
                        : null,
            },
        };
    }

    public async listOwnedStories(
        authorId: string,
        cursor: string | undefined,
        limit: number,
    ): Promise<StoryPage> {
        const decodedCursor = cursor
            ? cursorCodec.decode(cursor, dateIdCursorSchema)
            : null;
        const rows: StoryRow[] = await prisma.story.findMany({
            where: {
                authorId,
                deletedAt: null,
                ...(decodedCursor
                    ? {
                          OR: [
                              { updatedAt: { lt: new Date(decodedCursor.at) } },
                              {
                                  updatedAt: new Date(decodedCursor.at),
                                  id: { lt: decodedCursor.id },
                              },
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
                nextCursor:
                    hasMore && last
                        ? cursorCodec.encode({
                              at: last.updatedAt.toISOString(),
                              id: last.id,
                          })
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
}
