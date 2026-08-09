import { prisma } from "../../../db/index.js";

import type { SearchStore } from "../application/search.ports.js";

export class PrismaSearchStore implements SearchStore {
    public searchStories(query: string, limit: number) {
        return prisma.story.findMany({
            where: {
                deletedAt: null,
                moderationState: "VISIBLE",
                visibility: "PUBLIC",
                publishedAt: { not: null },
                status: { not: "DRAFT" },
                author: { status: "ACTIVE" },
                OR: [
                    { title: { contains: query, mode: "insensitive" } },
                    { description: { contains: query, mode: "insensitive" } },
                    { tags: { some: { tag: { name: { contains: query, mode: "insensitive" } } } } },
                ],
            },
            orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
            take: limit,
            select: {
                id: true,
                slug: true,
                title: true,
                description: true,
                coverUrl: true,
                isMature: true,
                author: { select: { username: true, displayName: true } },
            },
        });
    }

    public searchUsers(query: string, limit: number) {
        return prisma.user.findMany({
            where: {
                status: "ACTIVE",
                OR: [
                    { username: { contains: query, mode: "insensitive" } },
                    { displayName: { contains: query, mode: "insensitive" } },
                ],
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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

    public async searchTags(query: string, limit: number) {
        const rows = await prisma.tag.findMany({
            where: { name: { contains: query, mode: "insensitive" } },
            orderBy: [{ name: "asc" }, { id: "asc" }],
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
