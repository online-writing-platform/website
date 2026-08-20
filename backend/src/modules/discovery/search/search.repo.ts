import { prisma } from "../../../db/index.js";
import { isAtLeastAge } from "../../stories/stories.policy.js";
import type { SearchStore } from "./search.types.js";

interface SearchStoryRow {
    id: string;
    slug: string;
    title: string;
    description: string;
    coverUrl: string | null;
    isMature: boolean;
    username: string;
    displayName: string;
    rank: number;
}

async function viewerPolicy(viewerId?: string) {
    if (!viewerId) return { includeMature: false, blockedIds: [] as string[] };
    const [viewer, blocks] = await Promise.all([
        prisma.user.findUnique({
            where: { id: viewerId },
            select: { birthDate: true, preferences: { select: { allowMatureContent: true } } },
        }),
        prisma.block.findMany({
            where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
            select: { blockerId: true, blockedId: true },
        }),
    ]);
    return {
        includeMature:
            viewer?.preferences?.allowMatureContent === true &&
            isAtLeastAge(viewer.birthDate, 18, new Date()),
        blockedIds: blocks.map((item) =>
            item.blockerId === viewerId ? item.blockedId : item.blockerId,
        ),
    };
}

export class SearchRepository implements SearchStore {
    public async searchStories(query: string, limit: number, offset: number, viewerId?: string) {
        const policy = await viewerPolicy(viewerId);
        const rows = await prisma.$queryRaw<SearchStoryRow[]>`
            SELECT story."id", story."slug", story."title", story."description",
                   story."cover_url" AS "coverUrl", story."is_mature" AS "isMature",
                   author."username", author."display_name" AS "displayName",
                   GREATEST(
                     ts_rank_cd(to_tsvector('simple', story."search_text"), websearch_to_tsquery('simple', ${query})),
                     similarity(story."search_text", ${query}) * 0.5,
                     similarity(lower(author."username"), ${query}) * 0.35
                   )::float AS "rank"
            FROM "stories" AS story
            JOIN "users" AS author ON author."id" = story."author_id"
            WHERE story."deleted_at" IS NULL
              AND story."moderation_state" = 'VISIBLE'
              AND story."visibility" = 'PUBLIC'
              AND story."published_at" IS NOT NULL
              AND story."status" NOT IN ('DRAFT', 'SCHEDULED', 'ARCHIVED')
              AND author."status" = 'ACTIVE'
              AND (${policy.includeMature} OR story."is_mature" = false)
              AND (cardinality(${policy.blockedIds}::uuid[]) = 0 OR story."author_id" <> ALL(${policy.blockedIds}::uuid[]))
              AND (
                to_tsvector('simple', story."search_text") @@ websearch_to_tsquery('simple', ${query})
                OR story."search_text" % ${query}
                OR lower(author."username") % ${query}
              )
            ORDER BY "rank" DESC, story."published_at" DESC, story."id" DESC
            LIMIT ${limit} OFFSET ${offset}
        `;
        return rows.map(({ username, displayName, rank: _rank, ...story }) => ({
            ...story,
            author: { username, displayName },
        }));
    }

    public async searchUsers(query: string, limit: number, offset: number, viewerId?: string) {
        const policy = await viewerPolicy(viewerId);
        return prisma.user.findMany({
            where: {
                status: "ACTIVE",
                ...(policy.blockedIds.length > 0 ? { id: { notIn: policy.blockedIds } } : {}),
                OR: [
                    { usernameNormalized: { contains: query } },
                    { displayName: { contains: query, mode: "insensitive" } },
                ],
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip: offset,
            take: limit,
            select: { id: true, username: true, displayName: true, bio: true, avatarUrl: true },
        });
    }

    public async searchTags(query: string, limit: number, offset: number, viewerId?: string) {
        const policy = await viewerPolicy(viewerId);
        const rows = await prisma.tag.findMany({
            where: { name: { contains: query, mode: "insensitive" } },
            orderBy: [{ name: "asc" }, { id: "asc" }],
            skip: offset,
            take: limit,
            select: {
                slug: true,
                name: true,
                _count: {
                    select: {
                        stories: {
                            where: {
                                story: {
                                    deletedAt: null,
                                    moderationState: "VISIBLE",
                                    visibility: "PUBLIC",
                                    publishedAt: { not: null },
                                    author: { status: "ACTIVE" },
                                    ...(policy.includeMature ? {} : { isMature: false }),
                                    ...(policy.blockedIds.length > 0 ? { authorId: { notIn: policy.blockedIds } } : {}),
                                },
                            },
                        },
                    },
                },
            },
        });
        return rows.map(({ _count, ...row }) => ({ ...row, storyCount: _count.stories }));
    }
}
