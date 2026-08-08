import { prisma } from "../db/index.js";
import AppError from "../errors/app-error.js";
import { normalizeUsername } from "../utils/normalize.js";
import { isPrismaErrorCode } from "../utils/prisma-error.js";
import type { UpdateProfileInput } from "../validators/user.validator.js";

export interface PrivateUserProfile {
    id: string;
    email: string;
    username: string;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface PublicUserProfile {
    id: string;
    username: string;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    createdAt: Date;
}

const privateProfileSelect = {
    id: true,
    email: true,
    username: true,
    displayName: true,
    bio: true,
    avatarUrl: true,
    createdAt: true,
    updatedAt: true,
} as const;

const publicProfileSelect = {
    id: true,
    username: true,
    displayName: true,
    bio: true,
    avatarUrl: true,
    createdAt: true,
} as const;

export async function getMyProfile(
    userId: string,
): Promise<PrivateUserProfile> {
    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },

        select: privateProfileSelect,
    });

    if (!user) {
        throw AppError.notFound(
            "The user account was not found.",
            "USER_NOT_FOUND",
        );
    }

    return user;
}

export async function getPublicProfile(
    usernameInput: string,
): Promise<PublicUserProfile> {
    const username = normalizeUsername(usernameInput);

    const user = await prisma.user.findUnique({
        where: {
            username,
        },

        select: publicProfileSelect,
    });

    if (!user) {
        throw AppError.notFound(
            "The requested user was not found.",
            "USER_NOT_FOUND",
        );
    }

    return user;
}

export async function updateMyProfile(
    userId: string,
    input: UpdateProfileInput,
): Promise<PrivateUserProfile> {
    const updateData: {
        username?: string;
        displayName?: string;
        bio?: string | null;
        avatarUrl?: string | null;
    } = {};

    if (input.username !== undefined) {
        const normalizedUsername = normalizeUsername(input.username);

        const existingUser = await prisma.user.findFirst({
            where: {
                username: normalizedUsername,
                NOT: {
                    id: userId,
                },
            },

            select: {
                id: true,
            },
        });

        if (existingUser) {
            throw AppError.conflict(
                "This username is already in use.",
                "USERNAME_ALREADY_EXISTS",
            );
        }

        updateData.username = normalizedUsername;
    }

    if (input.displayName !== undefined) {
        updateData.displayName = input.displayName.trim();
    }

    if (input.bio !== undefined) {
        updateData.bio = input.bio === null ? null : input.bio.trim();
    }

    if (input.avatarUrl !== undefined) {
        updateData.avatarUrl =
            input.avatarUrl === null ? null : input.avatarUrl.trim();
    }

    try {
        return await prisma.user.update({
            where: {
                id: userId,
            },

            data: updateData,

            select: privateProfileSelect,
        });
    } catch (error) {
        if (isPrismaErrorCode(error, "P2002")) {
            throw AppError.conflict(
                "This username is already in use.",
                "USERNAME_ALREADY_EXISTS",
            );
        }

        if (isPrismaErrorCode(error, "P2025")) {
            throw AppError.notFound(
                "The user account was not found.",
                "USER_NOT_FOUND",
            );
        }

        throw error;
    }
}
