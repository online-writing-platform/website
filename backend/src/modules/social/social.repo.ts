import { prisma } from "../../db/index.js";
import { buildCursorPage } from "../../shared/pagination/page.js";
import { isPrismaErrorCode } from "../../utils/prisma-error.js";

import type { SocialStore } from "./social.types.js";
import type { SocialUserSummary } from "./social.types.js";

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

export class SocialRepository implements SocialStore {
    public async follow(
        followerId: string,
        followingId: string,
    ): Promise<"CREATED" | "EXISTS" | "BLOCKED"> {
        try {
            return await prisma.$transaction(async (transaction) => {
                const relationshipKey = [followerId, followingId].sort().join(":");
                await transaction.$queryRaw`
                    SELECT pg_advisory_xact_lock(hashtextextended(${relationshipKey}, 3))
                `;
                const blocked = await transaction.block.count({
                    where: {
                        OR: [
                            { blockerId: followerId, blockedId: followingId },
                            { blockerId: followingId, blockedId: followerId },
                        ],
                    },
                });
                if (blocked > 0) return "BLOCKED" as const;
                await transaction.follow.create({
                    data: { followerId, followingId },
                    select: { followerId: true },
                });
                return "CREATED" as const;
            });
        } catch (error) {
            if (isPrismaErrorCode(error, "P2002")) {
                return "EXISTS";
            }
            throw error;
        }
    }

    public async unfollow(
        followerId: string,
        followingId: string,
    ): Promise<boolean> {
        const result = await prisma.follow.deleteMany({
            where: { followerId, followingId },
        });
        return result.count === 1;
    }

    public async isFollowing(
        followerId: string,
        followingId: string,
    ): Promise<boolean> {
        const row = await prisma.follow.findUnique({
            where: { followerId_followingId: { followerId, followingId } },
            select: { followerId: true },
        });
        return row !== null;
    }

    public async block(blockerId: string, blockedId: string): Promise<void> {
        await prisma.$transaction(async (transaction) => {
            const relationshipKey = [blockerId, blockedId].sort().join(":");
            await transaction.$queryRaw`
                SELECT pg_advisory_xact_lock(hashtextextended(${relationshipKey}, 3))
            `;
            await transaction.block.upsert({
                where: { blockerId_blockedId: { blockerId, blockedId } },
                update: {},
                create: { blockerId, blockedId },
            });
            await transaction.follow.deleteMany({
                where: {
                    OR: [
                        { followerId: blockerId, followingId: blockedId },
                        { followerId: blockedId, followingId: blockerId },
                    ],
                },
            });
        });
    }

    public async unblock(blockerId: string, blockedId: string): Promise<void> {
        await prisma.block.deleteMany({ where: { blockerId, blockedId } });
    }

    public async mute(muterId: string, mutedId: string): Promise<void> {
        await prisma.mute.upsert({
            where: { muterId_mutedId: { muterId, mutedId } },
            update: {},
            create: { muterId, mutedId },
        });
    }

    public async unmute(muterId: string, mutedId: string): Promise<void> {
        await prisma.mute.deleteMany({ where: { muterId, mutedId } });
    }

    public async isBlockedBetween(
        firstUserId: string,
        secondUserId: string,
    ): Promise<boolean> {
        const count = await prisma.block.count({
            where: {
                OR: [
                    { blockerId: firstUserId, blockedId: secondUserId },
                    { blockerId: secondUserId, blockedId: firstUserId },
                ],
            },
        });
        return count > 0;
    }

    public async relationship(actorId: string, targetId: string) {
        const [following, blockedByMe, blockedMe, mutedByMe] = await Promise.all([
            prisma.follow.findUnique({
                where: {
                    followerId_followingId: {
                        followerId: actorId,
                        followingId: targetId,
                    },
                },
                select: { followerId: true },
            }),
            prisma.block.findUnique({
                where: {
                    blockerId_blockedId: {
                        blockerId: actorId,
                        blockedId: targetId,
                    },
                },
                select: { blockerId: true },
            }),
            prisma.block.findUnique({
                where: {
                    blockerId_blockedId: {
                        blockerId: targetId,
                        blockedId: actorId,
                    },
                },
                select: { blockerId: true },
            }),
            prisma.mute.findUnique({
                where: {
                    muterId_mutedId: {
                        muterId: actorId,
                        mutedId: targetId,
                    },
                },
                select: { muterId: true },
            }),
        ]);

        return {
            following: following !== null,
            blockedByMe: blockedByMe !== null,
            blockedMe: blockedMe !== null,
            mutedByMe: mutedByMe !== null,
        };
    }

    public async listFollowers(
        userId: string,
        cursor: string | undefined,
        limit: number,
    ) {
        const rows: FollowerRow[] = await prisma.follow.findMany({
            where: { followingId: userId, follower: { status: "ACTIVE" } },
            orderBy: [{ createdAt: "desc" }, { followerId: "desc" }],
            take: limit + 1,
            ...(cursor
                ? {
                      cursor: {
                          followerId_followingId: {
                              followerId: cursor,
                              followingId: userId,
                          },
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

    public async listFollowing(
        userId: string,
        cursor: string | undefined,
        limit: number,
    ) {
        const rows: FollowingRow[] = await prisma.follow.findMany({
            where: { followerId: userId, following: { status: "ACTIVE" } },
            orderBy: [{ createdAt: "desc" }, { followingId: "desc" }],
            take: limit + 1,
            ...(cursor
                ? {
                      cursor: {
                          followerId_followingId: {
                              followerId: userId,
                              followingId: cursor,
                          },
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
