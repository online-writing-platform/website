import { prisma } from "../../../db/index.js";
import { buildCursorPage } from "../../../shared/pagination/page.js";
import { isAtLeastAge } from "../../stories/stories.policy.js";

import type { FeedStore } from "./feed.types.js";
import type { StorySummary } from "../../stories/stories.types.js";

interface FeedStoryRow {
    id: string;
    slug: string;
    title: string;
    description: string;
    coverUrl: string | null;
    language: string;
    rights:
        | "ALL_RIGHTS_RESERVED"
        | "PUBLIC_DOMAIN"
        | "CREATIVE_COMMONS";
    status: "DRAFT" | "SCHEDULED" | "ONGOING" | "COMPLETED" | "HIATUS" | "ARCHIVED";
    visibility: "PRIVATE" | "UNLISTED" | "PUBLIC";
    isMature: boolean;
    moderationState: "VISIBLE" | "HIDDEN" | "REMOVED";
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    author: {
        username: string;
        displayName: string;
        avatarUrl: string | null;
    };
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
        rights: row.rights,
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

export class FeedRepository implements FeedStore {
    public async listFollowingFeed(
        userId: string,
        cursor: string | undefined,
        limit: number,
    ) {
        const viewer = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                birthDate: true,
                preferences: {
                    select: { allowMatureContent: true },
                },
                mutesCreated: {
                    select: { mutedId: true },
                },
                blocksCreated: {
                    select: { blockedId: true },
                },
                blocksReceived: {
                    select: { blockerId: true },
                },
            },
        });

        const includeMature =
            viewer?.preferences?.allowMatureContent === true &&
            isAtLeastAge(viewer.birthDate, 18, new Date());

        const suppressedAuthorIds = [
            ...(viewer?.mutesCreated.map((mute) => mute.mutedId) ?? []),
            ...(viewer?.blocksCreated.map((block) => block.blockedId) ?? []),
            ...(viewer?.blocksReceived.map((block) => block.blockerId) ?? []),
        ];

        const rows: FeedStoryRow[] = await prisma.story.findMany({
            where: {
                deletedAt: null,
                moderationState: "VISIBLE",
                visibility: "PUBLIC",
                publishedAt: { not: null },
                status: { in: ["ONGOING", "COMPLETED", "HIATUS"] },
                ...(includeMature ? {} : { isMature: false }),
                author: {
                    status: "ACTIVE",
                    followers: { some: { followerId: userId } },
                    ...(suppressedAuthorIds.length > 0
                        ? { id: { notIn: suppressedAuthorIds } }
                        : {}),
                },
            },
            orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
            take: limit + 1,
            ...(cursor
                ? { cursor: { id: cursor }, skip: 1 }
                : {}),
            select: {
                id: true,
                slug: true,
                title: true,
                description: true,
                coverUrl: true,
                language: true,
                rights: true,
                status: true,
                visibility: true,
                isMature: true,
                moderationState: true,
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
                genre: { select: { slug: true, name: true } },
                tags: {
                    orderBy: { createdAt: "asc" },
                    select: {
                        tag: {
                            select: { slug: true, name: true },
                        },
                    },
                },
            },
        });

        const page = buildCursorPage(rows, limit, (row) => row.id);

        return {
            stories: page.items.map(mapStory),
            pagination: page.pagination,
        };
    }
}
