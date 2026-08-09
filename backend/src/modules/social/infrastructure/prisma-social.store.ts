import { prisma } from "../../../db/index.js";
import { buildCursorPage } from "../../../shared/pagination/page.js";

import type { SocialStore } from "../application/social.ports.js";
import type { SocialUserSummary } from "../domain/social.types.js";

interface FollowerRow {
    followerId: string;
    followingId: string;
    follower: SocialUserSummary;
}

interface FollowingRow {
    followerId: string;
    followingId: string;
    following: SocialUserSummary;
}

const profileSelect = {
    id: true,
    username: true,
    displayName: true,
    avatarUrl: true,
} as const;

export class PrismaSocialStore implements SocialStore {
    public async follow(followerId: string, followingId: string): Promise<"CREATED" | "EXISTS"> {
        const existing = await prisma.follow.findUnique({
            where: { followerId_followingId: { followerId, followingId } },
            select: { followerId: true },
        });
        if (existing) return "EXISTS";

        try {
            await prisma.follow.create({
                data: { followerId, followingId },
                select: { followerId: true },
            });
            return "CREATED";
        } catch {
            const raced = await prisma.follow.findUnique({
                where: { followerId_followingId: { followerId, followingId } },
                select: { followerId: true },
            });
            if (raced) return "EXISTS";
            throw new Error("Failed to create follow relationship.");
        }
    }

    public async unfollow(followerId: string, followingId: string): Promise<boolean> {
        const result = await prisma.follow.deleteMany({ where: { followerId, followingId } });
        return result.count === 1;
    }

    public async isFollowing(followerId: string, followingId: string): Promise<boolean> {
        const row = await prisma.follow.findUnique({
            where: { followerId_followingId: { followerId, followingId } },
            select: { followerId: true },
        });
        return row !== null;
    }

    public async listFollowers(userId: string, cursor: string | undefined, limit: number) {
        const rows: FollowerRow[] = await prisma.follow.findMany({
            where: { followingId: userId, follower: { status: "ACTIVE" } },
            orderBy: [{ createdAt: "desc" }, { followerId: "desc" }],
            take: limit + 1,
            ...(cursor
                ? {
                      cursor: {
                          followerId_followingId: { followerId: cursor, followingId: userId },
                      },
                      skip: 1,
                  }
                : {}),
            select: {
                followerId: true,
                followingId: true,
                follower: { select: profileSelect },
            },
        });

        const page = buildCursorPage(rows, limit, (row) => row.followerId);
        return {
            users: page.items.map((row) => row.follower),
            pagination: page.pagination,
        };
    }

    public async listFollowing(userId: string, cursor: string | undefined, limit: number) {
        const rows: FollowingRow[] = await prisma.follow.findMany({
            where: { followerId: userId, following: { status: "ACTIVE" } },
            orderBy: [{ createdAt: "desc" }, { followingId: "desc" }],
            take: limit + 1,
            ...(cursor
                ? {
                      cursor: {
                          followerId_followingId: { followerId: userId, followingId: cursor },
                      },
                      skip: 1,
                  }
                : {}),
            select: {
                followerId: true,
                followingId: true,
                following: { select: profileSelect },
            },
        });

        const page = buildCursorPage(rows, limit, (row) => row.followingId);
        return {
            users: page.items.map((row) => row.following),
            pagination: page.pagination,
        };
    }
}
