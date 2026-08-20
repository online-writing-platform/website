import { prisma } from "../../db/index.js";
import type { PasswordResetRecord, PasswordResetUserRecord } from "./auth.types.js";

class AuthTransactionStateError extends Error {}

export class PasswordRepository {
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
}
