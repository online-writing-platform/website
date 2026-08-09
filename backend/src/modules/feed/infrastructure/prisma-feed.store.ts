import { prisma } from "../../../db/index.js";
import { buildCursorPage } from "../../../shared/pagination/page.js";

import type { FeedStore } from "../application/feed.ports.js";
import type { StorySummary } from "../../stories/index.js";

interface FeedStoryRow {
    id: string;
    slug: string;
    title: string;
    description: string;
    coverUrl: string | null;
    language: string;
    status: "DRAFT" | "ONGOING" | "COMPLETED" | "HIATUS";
    visibility: "PRIVATE" | "UNLISTED" | "PUBLIC";
    isMature: boolean;
    moderationState: "VISIBLE" | "HIDDEN" | "REMOVED";
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    author: { username: string; displayName: string; avatarUrl: string | null };
    genre: { slug: string; name: string } | null;
    tags: Array<{ tag: { slug: string; name: string } }>;
}

function mapStory(row: FeedStoryRow): StorySummary {
    return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: row.description,
        coverUrl: row.coverUrl,
        language: row.language,
        status: row.status,
        visibility: row.visibility,
        isMature: row.isMature,
        moderationState: row.moderationState,
        publishedAt: row.publishedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        author: row.author,
        genre: row.genre,
        tags: row.tags.map(({ tag }) => tag),
    };
}

export class PrismaFeedStore implements FeedStore {
    public async listFollowingFeed(userId: string, cursor: string | undefined, limit: number) {
        const rows: FeedStoryRow[] = await prisma.story.findMany({
            where: {
                deletedAt: null,
                moderationState: "VISIBLE",
                visibility: "PUBLIC",
                publishedAt: { not: null },
                status: { not: "DRAFT" },
                author: {
                    status: "ACTIVE",
                    followers: { some: { followerId: userId } },
                },
            },
            orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            select: {
                id: true,
                slug: true,
                title: true,
                description: true,
                coverUrl: true,
                language: true,
                status: true,
                visibility: true,
                isMature: true,
                moderationState: true,
                publishedAt: true,
                createdAt: true,
                updatedAt: true,
                author: { select: { username: true, displayName: true, avatarUrl: true } },
                genre: { select: { slug: true, name: true } },
                tags: {
                    orderBy: { createdAt: "asc" },
                    select: { tag: { select: { slug: true, name: true } } },
                },
            },
        });
        const page = buildCursorPage(rows, limit, (row) => row.id);
        return { stories: page.items.map(mapStory), pagination: page.pagination };
    }
}
