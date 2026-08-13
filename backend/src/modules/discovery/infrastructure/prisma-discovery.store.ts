import { prisma } from "../../../db/index.js";
import { isAtLeastAge } from "../../content/policy/mature.policy.js";

import type {
    DiscoveryCandidate,
    DiscoverySignals,
    DiscoveryStore,
} from "../application/discovery.ports.js";

function increment(map: Map<string, number>, key: string): void {
    map.set(key, (map.get(key) ?? 0) + 1);
}

export class PrismaDiscoveryStore implements DiscoveryStore {
    public async getSignals(userId?: string): Promise<DiscoverySignals> {
        const empty: DiscoverySignals = {
            followedAuthorIds: new Set(),
            preferredGenres: new Map(),
            preferredTags: new Map(),
            blockedUserIds: new Set(),
            includeMature: false,
        };

        if (!userId) return empty;

        const [viewer, follows, blocks, library, progress] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    birthDate: true,
                    status: true,
                    preferences: {
                        select: { allowMatureContent: true },
                    },
                },
            }),
            prisma.follow.findMany({
                where: { followerId: userId },
                select: { followingId: true },
            }),
            prisma.block.findMany({
                where: {
                    OR: [{ blockerId: userId }, { blockedId: userId }],
                },
                select: { blockerId: true, blockedId: true },
            }),
            prisma.libraryEntry.findMany({
                where: { userId },
                take: 100,
                orderBy: { addedAt: "desc" },
                select: {
                    story: {
                        select: {
                            genre: { select: { slug: true } },
                            tags: { select: { tag: { select: { slug: true } } } },
                        },
                    },
                },
            }),
            prisma.readingProgress.findMany({
                where: { userId },
                take: 100,
                orderBy: { lastReadAt: "desc" },
                select: {
                    story: {
                        select: {
                            genre: { select: { slug: true } },
                            tags: { select: { tag: { select: { slug: true } } } },
                        },
                    },
                },
            }),
        ]);

        const preferredGenres = new Map<string, number>();
        const preferredTags = new Map<string, number>();

        for (const item of [...library, ...progress]) {
            if (item.story.genre) increment(preferredGenres, item.story.genre.slug);
            for (const { tag } of item.story.tags) {
                increment(preferredTags, tag.slug);
            }
        }

        const blockedUserIds = new Set<string>();
        for (const block of blocks) {
            blockedUserIds.add(
                block.blockerId === userId ? block.blockedId : block.blockerId,
            );
        }

        return {
            followedAuthorIds: new Set(
                follows.map((follow) => follow.followingId),
            ),
            preferredGenres,
            preferredTags,
            blockedUserIds,
            includeMature:
                viewer?.status === "ACTIVE" &&
                viewer.preferences?.allowMatureContent === true &&
                isAtLeastAge(viewer.birthDate, 18, new Date()),
        };
    }

    public async listCandidates(
        signals: DiscoverySignals,
        limit: number,
    ): Promise<DiscoveryCandidate[]> {
        const rows = await prisma.story.findMany({
            where: {
                deletedAt: null,
                moderationState: "VISIBLE",
                visibility: "PUBLIC",
                publishedAt: { not: null },
                status: { in: ["ONGOING", "COMPLETED", "HIATUS"] },
                author: { status: "ACTIVE" },
                ...(signals.includeMature ? {} : { isMature: false }),
                ...(signals.blockedUserIds.size > 0
                    ? { authorId: { notIn: [...signals.blockedUserIds] } }
                    : {}),
            },
            orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
            take: limit,
            select: {
                id: true,
                slug: true,
                title: true,
                description: true,
                coverUrl: true,
                language: true,
                isMature: true,
                publishedAt: true,
                updatedAt: true,
                author: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                    },
                },
                genre: { select: { slug: true, name: true } },
                tags: {
                    select: { tag: { select: { slug: true, name: true } } },
                },
                _count: {
                    select: { libraryEntries: true },
                },
                chapters: {
                    where: {
                        deletedAt: null,
                        status: "PUBLISHED",
                        moderationState: "VISIBLE",
                    },
                    select: {
                        _count: {
                            select: { votes: true, comments: true },
                        },
                    },
                },
            },
        });

        return rows.flatMap((row) => {
            if (!row.publishedAt) return [];

            let voteCount = 0;
            let commentCount = 0;
            for (const chapter of row.chapters) {
                voteCount += chapter._count.votes;
                commentCount += chapter._count.comments;
            }

            return [
                {
                    id: row.id,
                    slug: row.slug,
                    title: row.title,
                    description: row.description,
                    coverUrl: row.coverUrl,
                    language: row.language,
                    isMature: row.isMature,
                    publishedAt: row.publishedAt,
                    updatedAt: row.updatedAt,
                    author: row.author,
                    genre: row.genre,
                    tags: row.tags.map(({ tag }) => tag),
                    libraryCount: row._count.libraryEntries,
                    voteCount,
                    commentCount,
                },
            ];
        });
    }
}
