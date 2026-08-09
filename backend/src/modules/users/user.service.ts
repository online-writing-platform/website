import { prisma } from "../../db/index.js";

import AppError from "../../errors/app-error.js";

import { normalizeUsername } from "../../utils/normalize.js";

import { isPrismaErrorCode } from "../../utils/prisma-error.js";

import type { UpdateProfileInput } from "./user.schema.js";

export interface PrivateUserProfile {
    id: string;

    email: string;

    username: string;
    displayName: string;

    bio: string | null;
    avatarUrl: string | null;

    birthDate: string;

    emailVerified: boolean;

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

interface PrivateUserRecord {
    id: string;

    email: string;

    username: string;
    displayName: string;

    bio: string | null;
    avatarUrl: string | null;

    birthDate: Date;

    emailVerifiedAt: Date | null;

    createdAt: Date;
    updatedAt: Date;
}

const privateProfileSelect = {
    id: true,

    email: true,

    username: true,
    displayName: true,

    bio: true,
    avatarUrl: true,

    birthDate: true,

    emailVerifiedAt: true,

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

function mapPrivateProfile(user: PrivateUserRecord): PrivateUserProfile {
    return {
        id: user.id,

        email: user.email,

        username: user.username,

        displayName: user.displayName,

        bio: user.bio,

        avatarUrl: user.avatarUrl,

        birthDate: user.birthDate.toISOString().slice(0, 10),

        emailVerified: user.emailVerifiedAt !== null,

        createdAt: user.createdAt,

        updatedAt: user.updatedAt,
    };
}

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

    return mapPrivateProfile(user);
}

export async function getPublicProfile(
    usernameInput: string,
): Promise<PublicUserProfile> {
    const usernameNormalized = normalizeUsername(usernameInput);

    const user = await prisma.user.findUnique({
        where: {
            usernameNormalized,
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
        displayName?: string;
        bio?: string | null;
        avatarUrl?: string | null;
    } = {};

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
        const user = await prisma.user.update({
            where: {
                id: userId,
            },

            data: updateData,

            select: privateProfileSelect,
        });

        return mapPrivateProfile(user);
    } catch (error) {
        if (isPrismaErrorCode(error, "P2025")) {
            throw AppError.notFound(
                "The user account was not found.",
                "USER_NOT_FOUND",
            );
        }

        throw error;
    }
}
