import { prisma } from "../../../db/index.js";

import { isPrismaErrorCode } from "../../../utils/prisma-error.js";

import type {
    AuthStore,
    CreateSessionInput,
    CreateUserWithSessionInput,
    EmailVerificationRecord,
    IdentityConflictRecord,
    PasswordResetRecord,
    PasswordResetUserRecord,
    SessionWithUserRecord,
    VerificationUserRecord,
} from "../application/auth.ports.js";

import { IdentityAlreadyExistsError } from "../domain/auth.errors.js";

import type {
    AuthUserRecord,
    AuthUserWithPassword,
} from "../domain/auth.types.js";

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

class PasswordResetConsumptionError extends Error {}

export class PrismaAuthStore implements AuthStore {
    public async findIdentityConflict(
        email: string,
        usernameNormalized: string,
    ): Promise<IdentityConflictRecord | null> {
        return prisma.user.findFirst({
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
    }

    public async createUserWithSession(
        input: CreateUserWithSessionInput,
    ): Promise<{
        user: AuthUserRecord;
        sessionId: string;
    }> {
        try {
            return await prisma.$transaction(async (transaction) => {
                const user = await transaction.user.create({
                    data: {
                        email: input.email,

                        username: input.username,

                        usernameNormalized: input.usernameNormalized,

                        passwordHash: input.passwordHash,

                        displayName: input.displayName,

                        birthDate: input.birthDate,

                        termsVersion: input.termsVersion,
                    },

                    select: authUserSelect,
                });

                const session = await transaction.session.create({
                    data: {
                        userId: user.id,

                        refreshTokenHash: input.session.refreshTokenHash,

                        expiresAt: input.session.expiresAt,

                        ...(input.session.userAgent
                            ? {
                                  userAgent: input.session.userAgent,
                              }
                            : {}),

                        ...(input.session.ipAddress
                            ? {
                                  ipAddress: input.session.ipAddress,
                              }
                            : {}),
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
        } catch (error) {
            if (isPrismaErrorCode(error, "P2002")) {
                throw new IdentityAlreadyExistsError();
            }

            throw error;
        }
    }

    public async findUserForLogin(
        email: string,
        usernameNormalized: string,
    ): Promise<AuthUserWithPassword | null> {
        return prisma.user.findFirst({
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
                ...authUserSelect,

                passwordHash: true,
            },
        });
    }

    public async createSession(input: CreateSessionInput): Promise<{
        id: string;
    }> {
        return prisma.session.create({
            data: {
                userId: input.userId,

                refreshTokenHash: input.refreshTokenHash,

                expiresAt: input.expiresAt,

                ...(input.userAgent
                    ? {
                          userAgent: input.userAgent,
                      }
                    : {}),

                ...(input.ipAddress
                    ? {
                          ipAddress: input.ipAddress,
                      }
                    : {}),
            },

            select: {
                id: true,
            },
        });
    }

    public async findSessionByRefreshTokenHash(
        refreshTokenHash: string,
    ): Promise<SessionWithUserRecord | null> {
        return prisma.session.findUnique({
            where: {
                refreshTokenHash,
            },

            include: {
                user: {
                    select: authUserSelect,
                },
            },
        });
    }

    public async revokeSessionById(
        sessionId: string,
        revokedAt: Date,
    ): Promise<void> {
        await prisma.session.updateMany({
            where: {
                id: sessionId,

                revokedAt: null,
            },

            data: {
                revokedAt,
            },
        });
    }

    public async rotateSession(
        sessionId: string,
        currentRefreshTokenHash: string,
        nextRefreshTokenHash: string,
        usedAt: Date,
    ): Promise<boolean> {
        const result = await prisma.session.updateMany({
            where: {
                id: sessionId,

                refreshTokenHash: currentRefreshTokenHash,

                revokedAt: null,

                expiresAt: {
                    gt: usedAt,
                },
            },

            data: {
                refreshTokenHash: nextRefreshTokenHash,

                lastUsedAt: usedAt,
            },
        });

        return result.count === 1;
    }

    public async revokeSessionByRefreshTokenHash(
        refreshTokenHash: string,
        revokedAt: Date,
    ): Promise<void> {
        await prisma.session.updateMany({
            where: {
                refreshTokenHash,

                revokedAt: null,
            },

            data: {
                revokedAt,
            },
        });
    }

    public async isSessionActive(
        userId: string,
        sessionId: string,
        now: Date,
    ): Promise<boolean> {
        const session = await prisma.session.findFirst({
            where: {
                id: sessionId,

                userId,

                revokedAt: null,

                expiresAt: {
                    gt: now,
                },

                user: {
                    status: "ACTIVE",
                },
            },

            select: {
                id: true,
            },
        });

        return session !== null;
    }

    public async findVerificationState(userId: string): Promise<{
        sentAt: Date;
    } | null> {
        return prisma.emailVerificationToken.findUnique({
            where: {
                userId,
            },

            select: {
                sentAt: true,
            },
        });
    }

    public async upsertVerificationToken(
        userId: string,
        tokenHash: string,
        expiresAt: Date,
        sentAt: Date,
    ): Promise<void> {
        await prisma.emailVerificationToken.upsert({
            where: {
                userId,
            },

            create: {
                userId,

                tokenHash,

                expiresAt,

                sentAt,
            },

            update: {
                tokenHash,

                expiresAt,

                sentAt,
            },
        });
    }

    public async findVerificationUser(
        userId: string,
    ): Promise<VerificationUserRecord | null> {
        return prisma.user.findUnique({
            where: {
                id: userId,
            },

            select: {
                email: true,

                emailVerifiedAt: true,

                status: true,
            },
        });
    }

    public async deleteVerificationToken(
        userId: string,
        tokenHash?: string,
    ): Promise<void> {
        await prisma.emailVerificationToken.deleteMany({
            where: {
                userId,

                ...(tokenHash
                    ? {
                          tokenHash,
                      }
                    : {}),
            },
        });
    }

    public async findVerificationByTokenHash(
        tokenHash: string,
    ): Promise<EmailVerificationRecord | null> {
        return prisma.emailVerificationToken.findUnique({
            where: {
                tokenHash,
            },

            select: {
                userId: true,

                expiresAt: true,

                user: {
                    select: {
                        status: true,

                        emailVerifiedAt: true,
                    },
                },
            },
        });
    }

    public async verifyEmailAndConsumeTokens(
        userId: string,
        verifiedAt: Date,
    ): Promise<void> {
        await prisma.$transaction(async (transaction) => {
            await transaction.user.update({
                where: {
                    id: userId,
                },

                data: {
                    emailVerifiedAt: verifiedAt,
                },
            });

            await transaction.emailVerificationToken.deleteMany({
                where: {
                    userId,
                },
            });
        });
    }

    public async findPasswordResetUser(
        email: string,
        usernameNormalized: string,
    ): Promise<PasswordResetUserRecord | null> {
        return prisma.user.findFirst({
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
                id: true,

                email: true,

                username: true,

                status: true,
            },
        });
    }

    public async findPasswordResetState(userId: string): Promise<{
        sentAt: Date;
    } | null> {
        return prisma.passwordResetToken.findUnique({
            where: {
                userId,
            },

            select: {
                sentAt: true,
            },
        });
    }

    public async upsertPasswordResetToken(
        userId: string,
        tokenHash: string,
        expiresAt: Date,
        sentAt: Date,
    ): Promise<void> {
        await prisma.passwordResetToken.upsert({
            where: {
                userId,
            },

            create: {
                userId,

                tokenHash,

                expiresAt,

                sentAt,
            },

            update: {
                tokenHash,

                expiresAt,

                sentAt,
            },
        });
    }

    public async deletePasswordResetToken(
        userId: string,
        tokenHash?: string,
    ): Promise<void> {
        await prisma.passwordResetToken.deleteMany({
            where: {
                userId,

                ...(tokenHash
                    ? {
                          tokenHash,
                      }
                    : {}),
            },
        });
    }

    public async findPasswordResetByTokenHash(
        tokenHash: string,
    ): Promise<PasswordResetRecord | null> {
        return prisma.passwordResetToken.findUnique({
            where: {
                tokenHash,
            },

            select: {
                userId: true,

                expiresAt: true,

                user: {
                    select: {
                        email: true,

                        username: true,

                        status: true,
                    },
                },
            },
        });
    }

    public async resetPasswordAndRevokeSessions(
        userId: string,
        tokenHash: string,
        passwordHash: string,
        resetAt: Date,
    ): Promise<boolean> {
        try {
            return await prisma.$transaction(async (transaction) => {
                const consumed =
                    await transaction.passwordResetToken.deleteMany({
                        where: {
                            userId,

                            tokenHash,

                            expiresAt: {
                                gt: resetAt,
                            },
                        },
                    });

                if (consumed.count !== 1) {
                    return false;
                }

                const updatedUser = await transaction.user.updateMany({
                    where: {
                        id: userId,

                        status: {
                            in: ["ACTIVE", "SUSPENDED"],
                        },
                    },

                    data: {
                        passwordHash,
                    },
                });

                if (updatedUser.count !== 1) {
                    throw new PasswordResetConsumptionError();
                }

                await transaction.session.updateMany({
                    where: {
                        userId,

                        revokedAt: null,
                    },

                    data: {
                        revokedAt: resetAt,
                    },
                });

                return true;
            });
        } catch (error) {
            if (error instanceof PasswordResetConsumptionError) {
                return false;
            }

            throw error;
        }
    }
}
