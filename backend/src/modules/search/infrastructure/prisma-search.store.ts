import { prisma } from "../../../db/index.js";
import { isAtLeastAge } from "../../stories/domain/mature.policy.js";

import type { SearchStore } from "../application/search.ports.js";

async function viewerPolicy(viewerId?: string) {
    if (!viewerId) {
        return { includeMature: false, blockedIds: [] as string[] };
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

    return {
        includeMature:
            viewer?.preferences?.allowMatureContent === true &&
            isAtLeastAge(viewer.birthDate, 18, new Date()),
        blockedIds: blocks.map((block) =>
            block.blockerId === viewerId
                ? block.blockedId
                : block.blockerId,
        ),
    };
}

export class PrismaSearchStore implements SearchStore {
    public async searchStories(
        query: string,
        limit: number,
        offset: number,
        viewerId?: string,
    ) {
        const policy = await viewerPolicy(viewerId);

        return prisma.story.findMany({
            where: {
                deletedAt: null,
                moderationState: "VISIBLE",
                visibility: "PUBLIC",
                publishedAt: { not: null },
                status: { not: "DRAFT" },
                author: { status: "ACTIVE" },
                ...(policy.includeMature ? {} : { isMature: false }),
                ...(policy.blockedIds.length > 0
                    ? { authorId: { notIn: policy.blockedIds } }
                    : {}),
                OR: [
                    { title: { contains: query, mode: "insensitive" } },
                    {
                        description: {
                            contains: query,
                            mode: "insensitive",
                        },
                    },
                    {
                        tags: {
                            some: {
                                tag: {
                                    name: {
                                        contains: query,
                                        mode: "insensitive",
                                    },
                                },
                            },
                        },
                    },
                ],
            },
            orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
            skip: offset,
            take: limit,
            select: {
                id: true,
                slug: true,
                title: true,
                description: true,
                coverUrl: true,
                isMature: true,
                author: {
                    select: {
                        username: true,
                        displayName: true,
                    },
                },
            },
        });
    }

    public async searchUsers(
        query: string,
        limit: number,
        offset: number,
        viewerId?: string,
    ) {
        const policy = await viewerPolicy(viewerId);

        return prisma.user.findMany({
            where: {
                status: "ACTIVE",
                ...(policy.blockedIds.length > 0
                    ? { id: { notIn: policy.blockedIds } }
                    : {}),
                OR: [
                    {
                        username: {
                            contains: query,
                            mode: "insensitive",
                        },
                    },
                    {
                        displayName: {
                            contains: query,
                            mode: "insensitive",
                        },
                    },
                ],
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip: offset,
            take: limit,
            select: {
                id: true,
                username: true,
                displayName: true,
                bio: true,
                avatarUrl: true,
            },
        });
    }

    public async searchTags(
        query: string,
        limit: number,
        offset: number,
        viewerId?: string,
    ) {
        const policy = await viewerPolicy(viewerId);

        const rows = await prisma.tag.findMany({
            where: {
                name: { contains: query, mode: "insensitive" },
            },
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
                                    status: { not: "DRAFT" },
                                    author: { status: "ACTIVE" },
                                    ...(policy.includeMature
                                        ? {}
                                        : { isMature: false }),
                                    ...(policy.blockedIds.length > 0
                                        ? {
                                              authorId: {
                                                  notIn: policy.blockedIds,
                                              },
                                          }
                                        : {}),
                                },
                            },
                        },
                    },
                },
            },
        });

        return rows.map((row) => ({
            slug: row.slug,
            name: row.name,
            storyCount: row._count.stories,
        }));
    }
}
