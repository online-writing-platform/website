import env from "../../config/env.js";
import { prisma } from "../../db/index.js";

import AppError from "../../errors/app-error.js";

import { hashPassword, verifyPassword } from "../../security/password.js";

import {
    calculateSessionExpiration,
    createAccessToken,
    generateRefreshToken,
    hashRefreshToken,
} from "../../security/token.js";

import { normalizeEmail, normalizeUsername } from "../../utils/normalize.js";

import { isPrismaErrorCode } from "../../utils/prisma-error.js";

import {
    ensurePasswordMeetsPolicy,
    parseAndValidateBirthDate,
} from "./auth.policy.js";

import type { LoginInput, RegisterInput } from "./auth.schema.js";

import type {
    AuthenticatedUser,
    AuthenticationResult,
    ClientInformation,
} from "./auth.types.js";

type UserStatusValue = "ACTIVE" | "SUSPENDED" | "DELETED";

interface AuthUserRecord {
    id: string;

    email: string;

    username: string;
    displayName: string;

    bio: string | null;
    avatarUrl: string | null;

    emailVerifiedAt: Date | null;

    status: UserStatusValue;

    createdAt: Date;
    updatedAt: Date;
}

interface SessionMaterial {
    refreshToken: string;
    refreshTokenHash: string;

    expiresAt: Date;

    userAgent?: string;
    ipAddress?: string;
}

const authUserSelect = {
    id: true,

    email: true,

    username: true,
    displayName: true,

    bio: true,
    avatarUrl: true,

    emailVerifiedAt: true,

    status: true,

    createdAt: true,
    updatedAt: true,
} as const;

function mapAuthenticatedUser(user: AuthUserRecord): AuthenticatedUser {
    return {
        id: user.id,

        email: user.email,

        username: user.username,

        displayName: user.displayName,

        bio: user.bio,

        avatarUrl: user.avatarUrl,

        emailVerified: user.emailVerifiedAt !== null,

        createdAt: user.createdAt,

        updatedAt: user.updatedAt,
    };
}

function sanitizeClientInformation(
    clientInformation: ClientInformation,
): ClientInformation {
    const userAgent = clientInformation.userAgent?.trim().slice(0, 512);

    const ipAddress = clientInformation.ipAddress?.trim().slice(0, 45);

    return {
        ...(userAgent
            ? {
                  userAgent,
              }
            : {}),

        ...(ipAddress
            ? {
                  ipAddress,
              }
            : {}),
    };
}

function createSessionMaterial(
    clientInformation: ClientInformation,
): SessionMaterial {
    const refreshToken = generateRefreshToken();

    const refreshTokenHash = hashRefreshToken(refreshToken);

    const expiresAt = calculateSessionExpiration();

    const safeClientInformation = sanitizeClientInformation(clientInformation);

    return {
        refreshToken,
        refreshTokenHash,

        expiresAt,

        ...safeClientInformation,
    };
}

async function ensureIdentityIsAvailable(
    email: string,
    usernameNormalized: string,
): Promise<void> {
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                {
                    email,
                },

                {
                    usernameNormalized,
                },
            ],
        },

        select: {
            email: true,
            usernameNormalized: true,
        },
    });

    if (!existingUser) {
        return;
    }

    if (existingUser.email === email) {
        throw AppError.conflict(
            "An account with this email already exists.",
            "EMAIL_ALREADY_EXISTS",
        );
    }

    throw AppError.conflict(
        "This username is already in use.",
        "USERNAME_ALREADY_EXISTS",
    );
}

function ensureAccountCanLogin(status: UserStatusValue): void {
    if (status === "ACTIVE") {
        return;
    }

    if (status === "SUSPENDED") {
        throw AppError.forbidden(
            "This account has been suspended.",
            "ACCOUNT_SUSPENDED",
        );
    }

    throw AppError.unauthorized(
        "The email, username, or password is incorrect.",
        "INVALID_CREDENTIALS",
    );
}

export async function registerUser(
    input: RegisterInput,
    clientInformation: ClientInformation,
): Promise<AuthenticationResult> {
    const email = normalizeEmail(input.email);

    const username = input.username.trim();

    const usernameNormalized = normalizeUsername(username);

    const birthDate = parseAndValidateBirthDate(input.birthDate);

    ensurePasswordMeetsPolicy(input.password, username);

    await ensureIdentityIsAvailable(email, usernameNormalized);

    const passwordHash = await hashPassword(input.password);

    const sessionMaterial = createSessionMaterial(clientInformation);

    try {
        const result = await prisma.$transaction(async (transaction) => {
            const user = await transaction.user.create({
                data: {
                    email,

                    username,
                    usernameNormalized,

                    passwordHash,

                    displayName: username,

                    birthDate,

                    termsVersion: env.termsVersion,
                },

                select: authUserSelect,
            });

            const session = await transaction.session.create({
                data: {
                    userId: user.id,

                    refreshTokenHash: sessionMaterial.refreshTokenHash,

                    expiresAt: sessionMaterial.expiresAt,

                    userAgent: sessionMaterial.userAgent,

                    ipAddress: sessionMaterial.ipAddress,
                },

                select: {
                    id: true,
                },
            });

            return {
                user,
                sessionId: session.id,
            };
        });

        const accessToken = await createAccessToken({
            userId: result.user.id,

            sessionId: result.sessionId,
        });

        return {
            user: mapAuthenticatedUser(result.user),

            accessToken,

            refreshToken: sessionMaterial.refreshToken,

            sessionExpiresAt: sessionMaterial.expiresAt,
        };
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }

        if (isPrismaErrorCode(error, "P2002")) {
            throw AppError.conflict(
                "The email or username is already in use.",
                "IDENTITY_ALREADY_EXISTS",
            );
        }

        throw error;
    }
}

export async function loginUser(
    input: LoginInput,
    clientInformation: ClientInformation,
): Promise<AuthenticationResult> {
    const identifier = input.identifier.trim();

    const normalizedIdentifier = identifier.toLowerCase();

    const user = await prisma.user.findFirst({
        where: {
            OR: [
                {
                    email: normalizeEmail(identifier),
                },

                {
                    usernameNormalized: normalizedIdentifier,
                },
            ],
        },

        select: {
            ...authUserSelect,

            passwordHash: true,
        },
    });

    if (!user) {
        throw AppError.unauthorized(
            "The email, username, or password is incorrect.",
            "INVALID_CREDENTIALS",
        );
    }

    const passwordIsValid = await verifyPassword(
        user.passwordHash,
        input.password,
    );

    if (!passwordIsValid) {
        throw AppError.unauthorized(
            "The email, username, or password is incorrect.",
            "INVALID_CREDENTIALS",
        );
    }

    ensureAccountCanLogin(user.status);

    const sessionMaterial = createSessionMaterial(clientInformation);

    const session = await prisma.session.create({
        data: {
            userId: user.id,

            refreshTokenHash: sessionMaterial.refreshTokenHash,

            expiresAt: sessionMaterial.expiresAt,

            userAgent: sessionMaterial.userAgent,

            ipAddress: sessionMaterial.ipAddress,
        },

        select: {
            id: true,
        },
    });

    const accessToken = await createAccessToken({
        userId: user.id,

        sessionId: session.id,
    });

    return {
        user: mapAuthenticatedUser(user),

        accessToken,

        refreshToken: sessionMaterial.refreshToken,

        sessionExpiresAt: sessionMaterial.expiresAt,
    };
}

export async function refreshAuthentication(
    currentRefreshToken: string,
): Promise<AuthenticationResult> {
    const currentTokenHash = hashRefreshToken(currentRefreshToken);

    const now = new Date();

    const session = await prisma.session.findUnique({
        where: {
            refreshTokenHash: currentTokenHash,
        },

        include: {
            user: {
                select: authUserSelect,
            },
        },
    });

    if (!session || session.revokedAt !== null || session.expiresAt <= now) {
        if (session && session.revokedAt === null) {
            await prisma.session.update({
                where: {
                    id: session.id,
                },

                data: {
                    revokedAt: now,
                },
            });
        }

        throw AppError.unauthorized(
            "The session is invalid or expired.",
            "INVALID_SESSION",
        );
    }

    if (session.user.status !== "ACTIVE") {
        await prisma.session.update({
            where: {
                id: session.id,
            },

            data: {
                revokedAt: now,
            },
        });

        throw AppError.unauthorized(
            "The session is no longer active.",
            "INACTIVE_SESSION",
        );
    }

    const nextRefreshToken = generateRefreshToken();

    const nextRefreshTokenHash = hashRefreshToken(nextRefreshToken);

    const updateResult = await prisma.session.updateMany({
        where: {
            id: session.id,

            refreshTokenHash: currentTokenHash,

            revokedAt: null,

            expiresAt: {
                gt: now,
            },
        },

        data: {
            refreshTokenHash: nextRefreshTokenHash,

            lastUsedAt: now,
        },
    });

    if (updateResult.count !== 1) {
        throw AppError.unauthorized(
            "The session has already been refreshed or revoked.",
            "SESSION_ROTATION_FAILED",
        );
    }

    const accessToken = await createAccessToken({
        userId: session.userId,

        sessionId: session.id,
    });

    return {
        user: mapAuthenticatedUser(session.user),

        accessToken,

        refreshToken: nextRefreshToken,

        sessionExpiresAt: session.expiresAt,
    };
}

export async function logoutUser(
    refreshToken: string | undefined,
): Promise<void> {
    if (!refreshToken) {
        return;
    }

    const refreshTokenHash = hashRefreshToken(refreshToken);

    await prisma.session.updateMany({
        where: {
            refreshTokenHash,

            revokedAt: null,
        },

        data: {
            revokedAt: new Date(),
        },
    });
}
