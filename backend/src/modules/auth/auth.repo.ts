import { prisma } from "../../db/index.js";
import { isPrismaErrorCode } from "../../utils/prisma-error.js";
import type { CreateUserWithSessionInput, EmailVerificationRecord, IdentityConflictRecord, VerificationUserRecord, AuthUserRecord, AuthUserWithPassword } from "./auth.types.js";
import { IdentityAlreadyExistsError } from "./auth.types.js";

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

export class AuthRepository {
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
}
