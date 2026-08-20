import { prisma } from "../../db/index.js";

import type { UserProfileStore } from "./user.types.js";
import type { UpdateProfileInput, UserCounts } from "./user.types.js";

const privateSelect = {
    id: true,
    email: true,
    username: true,
    displayName: true,
    bio: true,
    avatarUrl: true,
    birthDate: true,
    emailVerifiedAt: true,
    role: true,
    createdAt: true,
    updatedAt: true,
} as const;

const publicSelect = {
    id: true,
    username: true,
    displayName: true,
    bio: true,
    avatarUrl: true,
    createdAt: true,
} as const;

const directorySelect = {
    id: true,
    username: true,
    displayName: true,
    avatarUrl: true,
} as const;

export class UserRepository implements UserProfileStore {
    public findPrivateProfile(userId: string) {
        return prisma.user.findFirst({
            where: { id: userId, status: "ACTIVE" },
            select: privateSelect,
        });
    }

    public findPublicProfile(usernameNormalized: string) {
        return prisma.user.findFirst({
            where: { usernameNormalized, status: "ACTIVE" },
            select: publicSelect,
        });
    }

    public findDirectoryEntry(usernameNormalized: string) {
        return prisma.user.findFirst({
            where: { usernameNormalized, status: "ACTIVE" },
            select: directorySelect,
        });
    }

    public findDirectoryEntryById(userId: string) {
        return prisma.user.findFirst({
            where: { id: userId, status: "ACTIVE" },
            select: directorySelect,
        });
    }

    public async getCounts(userId: string): Promise<UserCounts> {
        const [followers, following, publishedStories] = await Promise.all([
            prisma.follow.count({ where: { followingId: userId } }),
            prisma.follow.count({ where: { followerId: userId } }),
            prisma.story.count({
                where: {
                    authorId: userId,
                    deletedAt: null,
                    moderationState: "VISIBLE",
                    visibility: "PUBLIC",
                    publishedAt: { not: null },
                    status: { in: ["ONGOING", "COMPLETED", "HIATUS"] },
                },
            }),
        ]);

        return { followers, following, publishedStories };
    }

    public async updateProfile(userId: string, input: UpdateProfileInput) {
        const result = await prisma.user.updateMany({
            where: { id: userId, status: "ACTIVE" },
            data: input,
        });

        if (result.count !== 1) {
            return null;
        }

        return this.findPrivateProfile(userId);
    }
}
