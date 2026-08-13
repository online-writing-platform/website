import { prisma } from "../../../db/index.js";
import { isPrismaErrorCode } from "../../../utils/prisma-error.js";

import type {
    AccountSecurityUserRecord,
    AuthStore,
    CreateSessionInput,
    CreateUserWithSessionInput,
    EmailChangeRecord,
    EmailVerificationRecord,
    IdentityConflictRecord,
    PasswordResetRecord,
    PasswordResetUserRecord,
    SessionWithUserRecord,
    VerificationUserRecord,
} from "../application/auth.ports.js";

import { IdentityAlreadyExistsError } from "../domain/auth.errors.js";

import type {
    AuthContext,
    AuthUserRecord,
    AuthUserWithPassword,
    SessionView,
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
    role: true,
    createdAt: true,
    updatedAt: true,
} as const;

class AuthTransactionStateError extends Error {}

export class PrismaAuthStore implements AuthStore {
    public findIdentityConflict(
        email: string,
        usernameNormalized: string,
    ): Promise<IdentityConflictRecord | null> {
        return prisma.user.findFirst({
            where: {
                OR: [{ email }, { usernameNormalized }],
            },
            select: {
                email: true,
                usernameNormalized: true,
            },
        });
    }

    public async createUserWithSession(
        input: CreateUserWithSessionInput,
    ): Promise<{ user: AuthUserRecord; sessionId: string }> {
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
                            ? { userAgent: input.session.userAgent }
                            : {}),
                        ...(input.session.ipAddress
                            ? { ipAddress: input.session.ipAddress }
                            : {}),
                    },
                    select: { id: true },
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

    public findUserForLogin(
        email: string,
        usernameNormalized: string,
    ): Promise<AuthUserWithPassword | null> {
        return prisma.user.findFirst({
            where: {
                OR: [{ email }, { usernameNormalized }],
            },
            select: {
                ...authUserSelect,
                passwordHash: true,
            },
        });
    }

    public createSession(input: CreateSessionInput): Promise<{ id: string }> {
        return prisma.session.create({
            data: {
                userId: input.userId,
                refreshTokenHash: input.refreshTokenHash,
                expiresAt: input.expiresAt,
                ...(input.userAgent ? { userAgent: input.userAgent } : {}),
                ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
            },
            select: { id: true },
        });
    }

    public findSessionByRefreshTokenHash(
        refreshTokenHash: string,
    ): Promise<SessionWithUserRecord | null> {
        return prisma.session.findUnique({
            where: { refreshTokenHash },
            include: {
                user: {
                    select: authUserSelect,
                },
            },
        });
    }

    public findConsumedSessionByRefreshTokenHash(refreshTokenHash: string) {
        return prisma.consumedRefreshToken.findUnique({
            where: { tokenHash: refreshTokenHash },
            select: {
                sessionId: true,
                expiresAt: true,
                session: { select: { revokedAt: true } },
            },
        }).then((record) =>
            record
                ? {
                      sessionId: record.sessionId,
                      expiresAt: record.expiresAt,
                      revokedAt: record.session.revokedAt,
                  }
                : null,
        );
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
            data: { revokedAt },
        });
    }

    public async rotateSession(
        sessionId: string,
        currentRefreshTokenHash: string,
        nextRefreshTokenHash: string,
        usedAt: Date,
    ): Promise<boolean> {
        try {
            return await prisma.$transaction(async (transaction) => {
                const current = await transaction.session.findFirst({
                    where: {
                        id: sessionId,
                        refreshTokenHash: currentRefreshTokenHash,
                        revokedAt: null,
                        expiresAt: { gt: usedAt },
                    },
                    select: { expiresAt: true },
                });
                if (!current) return false;

                await transaction.consumedRefreshToken.create({
                    data: {
                        tokenHash: currentRefreshTokenHash,
                        sessionId,
                        expiresAt: current.expiresAt,
                    },
                });
                const result = await transaction.session.updateMany({
                    where: {
                        id: sessionId,
                        refreshTokenHash: currentRefreshTokenHash,
                        revokedAt: null,
                    },
                    data: {
                        refreshTokenHash: nextRefreshTokenHash,
                        lastUsedAt: usedAt,
                    },
                });
                return result.count === 1;
            });
        } catch (error) {
            if (isPrismaErrorCode(error, "P2002")) return false;
            throw error;
        }
    }

    public async revokeSessionByRefreshTokenHash(
        refreshTokenHash: string,
        revokedAt: Date,
    ): Promise<void> {
        await prisma.$transaction(async (transaction) => {
            const active = await transaction.session.findUnique({
                where: { refreshTokenHash },
                select: { id: true },
            });
            const consumed = active
                ? null
                : await transaction.consumedRefreshToken.findUnique({
                      where: { tokenHash: refreshTokenHash },
                      select: { sessionId: true },
                  });
            const sessionId = active?.id ?? consumed?.sessionId;
            if (sessionId) {
                await transaction.session.updateMany({
                    where: { id: sessionId, revokedAt: null },
                    data: { revokedAt },
                });
            }
        });
    }

    public async getAuthenticatedPrincipal(
        userId: string,
        sessionId: string,
        now: Date,
    ): Promise<AuthContext | null> {
        const session = await prisma.session.findFirst({
            where: {
                id: sessionId,
                userId,
                revokedAt: null,
                expiresAt: { gt: now },
                user: { status: "ACTIVE" },
            },
            select: {
                id: true,
                userId: true,
                user: {
                    select: {
                        role: true,
                        emailVerifiedAt: true,
                    },
                },
            },
        });

        if (!session) {
            return null;
        }

        return {
            userId: session.userId,
            sessionId: session.id,
            role: session.user.role,
            emailVerified: session.user.emailVerifiedAt !== null,
        };
    }

    public findVerificationState(userId: string): Promise<{ sentAt: Date } | null> {
        return prisma.emailVerificationToken.findUnique({
            where: { userId },
            select: { sentAt: true },
        });
    }

    public async upsertVerificationToken(
        userId: string,
        tokenHash: string,
        expiresAt: Date,
        sentAt: Date,
    ): Promise<void> {
        await prisma.emailVerificationToken.upsert({
            where: { userId },
            create: { userId, tokenHash, expiresAt, sentAt },
            update: { tokenHash, expiresAt, sentAt },
        });
    }

    public findVerificationUser(
        userId: string,
    ): Promise<VerificationUserRecord | null> {
        return prisma.user.findUnique({
            where: { id: userId },
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
                ...(tokenHash ? { tokenHash } : {}),
            },
        });
    }

    public findVerificationByTokenHash(
        tokenHash: string,
    ): Promise<EmailVerificationRecord | null> {
        return prisma.emailVerificationToken.findUnique({
            where: { tokenHash },
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
            await transaction.user.updateMany({
                where: {
                    id: userId,
                    status: { not: "DELETED" },
                },
                data: { emailVerifiedAt: verifiedAt },
            });

            await transaction.emailVerificationToken.deleteMany({
                where: { userId },
            });
        });
    }

    public findPasswordResetUser(
        email: string,
        usernameNormalized: string,
    ): Promise<PasswordResetUserRecord | null> {
        return prisma.user.findFirst({
            where: {
                OR: [{ email }, { usernameNormalized }],
            },
            select: {
                id: true,
                email: true,
                username: true,
                status: true,
            },
        });
    }

    public findPasswordResetState(userId: string): Promise<{ sentAt: Date } | null> {
        return prisma.passwordResetToken.findUnique({
            where: { userId },
            select: { sentAt: true },
        });
    }

    public async upsertPasswordResetToken(
        userId: string,
        tokenHash: string,
        expiresAt: Date,
        sentAt: Date,
    ): Promise<void> {
        await prisma.passwordResetToken.upsert({
            where: { userId },
            create: { userId, tokenHash, expiresAt, sentAt },
            update: { tokenHash, expiresAt, sentAt },
        });
    }

    public async deletePasswordResetToken(
        userId: string,
        tokenHash?: string,
    ): Promise<void> {
        await prisma.passwordResetToken.deleteMany({
            where: {
                userId,
                ...(tokenHash ? { tokenHash } : {}),
            },
        });
    }

    public findPasswordResetByTokenHash(
        tokenHash: string,
    ): Promise<PasswordResetRecord | null> {
        return prisma.passwordResetToken.findUnique({
            where: { tokenHash },
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
                const consumed = await transaction.passwordResetToken.deleteMany({
                    where: {
                        userId,
                        tokenHash,
                        expiresAt: { gt: resetAt },
                    },
                });

                if (consumed.count !== 1) {
                    return false;
                }

                const updatedUser = await transaction.user.updateMany({
                    where: {
                        id: userId,
                        status: { in: ["ACTIVE", "SUSPENDED"] },
                    },
                    data: { passwordHash },
                });

                if (updatedUser.count !== 1) {
                    throw new AuthTransactionStateError();
                }

                await transaction.session.updateMany({
                    where: { userId, revokedAt: null },
                    data: { revokedAt: resetAt },
                });

                return true;
            });
        } catch (error) {
            if (error instanceof AuthTransactionStateError) {
                return false;
            }

            throw error;
        }
    }

    public findAccountSecurityUser(
        userId: string,
    ): Promise<AccountSecurityUserRecord | null> {
        return prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                username: true,
                usernameNormalized: true,
                passwordHash: true,
                status: true,
            },
        });
    }

    public async findUserIdByEmail(email: string): Promise<string | null> {
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });

        return user?.id ?? null;
    }

    public async changePasswordAndRevokeOtherSessions(
        userId: string,
        currentSessionId: string,
        passwordHash: string,
        changedAt: Date,
    ): Promise<boolean> {
        return prisma.$transaction(async (transaction) => {
            const updated = await transaction.user.updateMany({
                where: { id: userId, status: "ACTIVE" },
                data: { passwordHash },
            });

            if (updated.count !== 1) {
                return false;
            }

            await transaction.passwordResetToken.deleteMany({ where: { userId } });

            await transaction.session.updateMany({
                where: {
                    userId,
                    id: { not: currentSessionId },
                    revokedAt: null,
                },
                data: { revokedAt: changedAt },
            });

            return true;
        });
    }

    public async updateUsername(
        userId: string,
        username: string,
        usernameNormalized: string,
    ): Promise<boolean> {
        try {
            const result = await prisma.user.updateMany({
                where: { id: userId, status: "ACTIVE" },
                data: { username, usernameNormalized },
            });

            return result.count === 1;
        } catch (error) {
            if (isPrismaErrorCode(error, "P2002")) {
                throw new IdentityAlreadyExistsError();
            }

            throw error;
        }
    }

    public findEmailChangeState(userId: string): Promise<{
        newEmail: string;
        sentAt: Date;
    } | null> {
        return prisma.emailChangeToken.findUnique({
            where: { userId },
            select: { newEmail: true, sentAt: true },
        });
    }

    public async upsertEmailChangeToken(
        userId: string,
        newEmail: string,
        tokenHash: string,
        expiresAt: Date,
        sentAt: Date,
    ): Promise<void> {
        try {
            await prisma.emailChangeToken.upsert({
                where: { userId },
                create: { userId, newEmail, tokenHash, expiresAt, sentAt },
                update: { newEmail, tokenHash, expiresAt, sentAt },
            });
        } catch (error) {
            if (isPrismaErrorCode(error, "P2002")) {
                throw new IdentityAlreadyExistsError();
            }

            throw error;
        }
    }

    public async deleteEmailChangeToken(
        userId: string,
        tokenHash?: string,
    ): Promise<void> {
        await prisma.emailChangeToken.deleteMany({
            where: {
                userId,
                ...(tokenHash ? { tokenHash } : {}),
            },
        });
    }

    public findEmailChangeByTokenHash(
        tokenHash: string,
    ): Promise<EmailChangeRecord | null> {
        return prisma.emailChangeToken.findUnique({
            where: { tokenHash },
            select: {
                userId: true,
                newEmail: true,
                expiresAt: true,
                user: { select: { status: true } },
            },
        });
    }

    public async applyEmailChangeAndRevokeSessions(
        userId: string,
        tokenHash: string,
        newEmail: string,
        changedAt: Date,
    ): Promise<boolean> {
        try {
            return await prisma.$transaction(async (transaction) => {
                const consumed = await transaction.emailChangeToken.deleteMany({
                    where: {
                        userId,
                        tokenHash,
                        newEmail,
                        expiresAt: { gt: changedAt },
                    },
                });

                if (consumed.count !== 1) {
                    return false;
                }

                const updated = await transaction.user.updateMany({
                    where: { id: userId, status: "ACTIVE" },
                    data: {
                        email: newEmail,
                        emailVerifiedAt: changedAt,
                    },
                });

                if (updated.count !== 1) {
                    throw new AuthTransactionStateError();
                }

                await transaction.emailVerificationToken.deleteMany({ where: { userId } });
                await transaction.passwordResetToken.deleteMany({ where: { userId } });
                await transaction.session.updateMany({
                    where: { userId, revokedAt: null },
                    data: { revokedAt: changedAt },
                });

                return true;
            });
        } catch (error) {
            if (isPrismaErrorCode(error, "P2002")) {
                throw new IdentityAlreadyExistsError();
            }

            if (error instanceof AuthTransactionStateError) {
                return false;
            }

            throw error;
        }
    }

    public async listActiveSessions(
        userId: string,
        now: Date,
    ): Promise<Array<Omit<SessionView, "current">>> {
        return prisma.session.findMany({
            where: {
                userId,
                revokedAt: null,
                expiresAt: { gt: now },
            },
            orderBy: { lastUsedAt: "desc" },
            select: {
                id: true,
                userAgent: true,
                ipAddress: true,
                lastUsedAt: true,
                expiresAt: true,
                createdAt: true,
            },
        });
    }

    public async revokeOwnedSession(
        userId: string,
        sessionId: string,
        revokedAt: Date,
    ): Promise<boolean> {
        const result = await prisma.session.updateMany({
            where: {
                id: sessionId,
                userId,
                revokedAt: null,
            },
            data: { revokedAt },
        });

        return result.count === 1;
    }

    public async revokeOtherSessions(
        userId: string,
        currentSessionId: string,
        revokedAt: Date,
    ): Promise<number> {
        const result = await prisma.session.updateMany({
            where: {
                userId,
                id: { not: currentSessionId },
                revokedAt: null,
            },
            data: { revokedAt },
        });

        return result.count;
    }

    public async deleteAccount(
        userId: string,
        tombstoneEmail: string,
        tombstoneUsername: string,
        passwordHash: string,
        deletedAt: Date,
    ): Promise<boolean> {
        return prisma.$transaction(async (transaction) => {
            const user = await transaction.user.updateMany({
                where: { id: userId, status: "ACTIVE" },
                data: {
                    email: tombstoneEmail,
                    username: tombstoneUsername,
                    usernameNormalized: tombstoneUsername,
                    passwordHash,
                    displayName: "Deleted user",
                    bio: null,
                    avatarUrl: null,
                    emailVerifiedAt: null,
                    status: "DELETED",
                    role: "USER",
                },
            });

            if (user.count !== 1) {
                return false;
            }

            await transaction.story.updateMany({
                where: { authorId: userId, deletedAt: null },
                data: {
                    visibility: "PRIVATE",
                    deletedAt,
                },
            });

            await transaction.comment.updateMany({
                where: { userId },
                data: {
                    status: "DELETED",
                    content: "[deleted]",
                },
            });

            await transaction.follow.deleteMany({
                where: {
                    OR: [{ followerId: userId }, { followingId: userId }],
                },
            });

            await transaction.libraryEntry.deleteMany({ where: { userId } });
            await transaction.readingProgress.deleteMany({ where: { userId } });
            await transaction.readingList.deleteMany({ where: { userId } });
            await transaction.chapterVote.deleteMany({ where: { userId } });
            await transaction.notification.deleteMany({ where: { recipientId: userId } });
            await transaction.notification.updateMany({
                where: { actorId: userId },
                data: { actorId: null },
            });

            await transaction.session.updateMany({
                where: { userId, revokedAt: null },
                data: { revokedAt: deletedAt },
            });

            await transaction.emailVerificationToken.deleteMany({ where: { userId } });
            await transaction.passwordResetToken.deleteMany({ where: { userId } });
            await transaction.emailChangeToken.deleteMany({ where: { userId } });

            return true;
        });
    }
}
