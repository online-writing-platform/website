import { prisma } from "../../db/index.js";
import { isPrismaErrorCode } from "../../utils/prisma-error.js";
import type { AccountSecurityUserRecord, EmailChangeRecord } from "./auth.types.js";
import { IdentityAlreadyExistsError } from "./auth.types.js";

class AuthTransactionStateError extends Error {}

export class AccountRepository {
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
