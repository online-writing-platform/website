import env from "../config/env.js";
import { prisma } from "../db/index.js";
import AppError from "../errors/app-error.js";
import type { ClientInformation } from "../types/auth.js";
import {
    calculateSessionExpiration,
    createAccessToken,
    generateRefreshToken,
    hashRefreshToken,
} from "../utils/token.js";
import { normalizeEmail, normalizeUsername } from "../utils/normalize.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { isPrismaErrorCode } from "../utils/prisma-error.js";
import type {
    LoginInput,
    RegisterInput,
} from "../validators/auth.validator.js";
import { assessPasswordStrength } from "../security/password-strength.js";

export interface AuthenticatedUser {
    id: string;
    email: string;
    username: string;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface AuthenticationResult {
    user: AuthenticatedUser;
    accessToken: string;
    refreshToken: string;
    sessionExpiresAt: Date;
    isPersistent: boolean;
}

interface AuthUserRecord {
    id: string;
    email: string;
    username: string;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
}

const authUserSelect = {
    id: true,
    email: true,
    username: true,
    displayName: true,
    bio: true,
    avatarUrl: true,
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
        ...(userAgent ? { userAgent } : {}),
        ...(ipAddress ? { ipAddress } : {}),
    };
}

async function ensureRegistrationIdentityIsAvailable(
    email: string,
    username: string,
): Promise<void> {
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                {
                    email,
                },
                {
                    username,
                },
            ],
        },

        select: {
            email: true,
            username: true,
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

function ensurePasswordIsAcceptable(password: string, userInputs: string[]): void {
    const assessment = assessPasswordStrength(password, userInputs);

    if (assessment.acceptable) {
        return;
    }

    throw AppError.badRequest(
        "The Selected Password is too weak.",
        "PASSWORD_TOO_WEAK",
        {
            score: assessment.score,
            level: assessment.level,
            warningKey: assessment.warningKey,
            suggestionKeys: assessment.suggestionKeys,
        },
    );
};

export async function registerUser(
    input: RegisterInput,
    clientInformation: ClientInformation,
): Promise<AuthenticationResult> {
    const email = normalizeEmail(input.email);
    const username = normalizeUsername(input.username);
    const displayName = input.displayName.trim();

    const emailLocalPart = email.split("@")[0] ?? "";

    ensurePasswordIsAcceptable(input.password, [
        email,
        emailLocalPart,
        username,
        displayName,
    ]);

    await ensureRegistrationIdentityIsAvailable(email, username);

    const passwordHash = await hashPassword(input.password);

    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);

    const isPersistent = true;
    const sessionExpiresAt = calculateSessionExpiration(isPersistent);

    const safeClientInformation = sanitizeClientInformation(clientInformation);

    try {
        const result = await prisma.$transaction(async (transaction) => {
            const user = await transaction.user.create({
                data: {
                    email,
                    username,
                    displayName: displayName,
                    passwordHash,
                    termsVersion: env.termsVersion,
                },

                select: authUserSelect,
            });

            const session = await transaction.session.create({
                data: {
                    userId: user.id,
                    refreshTokenHash,
                    isPersistent,
                    expiresAt: sessionExpiresAt,
                    userAgent: safeClientInformation.userAgent,
                    ipAddress: safeClientInformation.ipAddress,
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
            refreshToken,
            sessionExpiresAt,
            isPersistent,
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
    const identifier = input.identifier.trim().toLowerCase();

    const user = await prisma.user.findFirst({
        where: {
            OR: [
                {
                    email: identifier,
                },
                {
                    username: identifier,
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

    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);

    const isPersistent = input.rememberMe;
    const sessionExpiresAt = calculateSessionExpiration(isPersistent);

    const safeClientInformation = sanitizeClientInformation(clientInformation);

    const session = await prisma.session.create({
        data: {
            userId: user.id,
            refreshTokenHash,
            isPersistent,
            expiresAt: sessionExpiresAt,
            userAgent: safeClientInformation.userAgent,
            ipAddress: safeClientInformation.ipAddress,
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
        refreshToken,
        sessionExpiresAt,
        isPersistent,
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
        isPersistent: session.isPersistent,
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
