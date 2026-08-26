import { prisma } from "../../db/index.js";
import { isPrismaErrorCode } from "../../utils/prisma-error.js";
import type {
    AuthUserRecord,
    AuthUserWithPassword,
    CreateUserInput,
    EmailVerificationRecord,
    IdentityConflictRecord,
    VerificationUserRecord,
} from "./auth.types.js";
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

    public async createUser(input: CreateUserInput): Promise<AuthUserRecord> {
        try {
            return await prisma.user.create({
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
            create: {
                userId,
                tokenHash,
                expiresAt,
                sentAt,
                failedAttempts: 0,
            },
            update: {
                tokenHash,
                expiresAt,
                sentAt,
                failedAttempts: 0,
            },
        });
    }

    public findVerificationUserByEmail(
        email: string,
    ): Promise<VerificationUserRecord | null> {
        return prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                emailVerifiedAt: true,
                status: true,
            },
        });
    }

    public async deleteVerificationCode(
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

    public findVerificationByEmail(
        email: string,
    ): Promise<EmailVerificationRecord | null> {
        return prisma.emailVerificationToken.findFirst({
            where: { user: { email } },
            select: {
                userId: true,
                tokenHash: true,
                failedAttempts: true,
                expiresAt: true,
                user: {
                    select: authUserSelect,
                },
            },
        });
    }

    public async recordFailedVerificationAttempt(
        userId: string,
        tokenHash: string,
        maxAttempts: number,
    ): Promise<boolean> {
        return prisma.$transaction(async (transaction) => {
            const updated = await transaction.emailVerificationToken.updateMany({
                where: { userId, tokenHash },
                data: { failedAttempts: { increment: 1 } },
            });

            if (updated.count !== 1) {
                return false;
            }

            const current = await transaction.emailVerificationToken.findUnique({
                where: { userId },
                select: { failedAttempts: true, tokenHash: true },
            });

            if (
                !current ||
                current.tokenHash !== tokenHash ||
                current.failedAttempts >= maxAttempts
            ) {
                await transaction.emailVerificationToken.deleteMany({
                    where: { userId, tokenHash },
                });
                return false;
            }

            return true;
        });
    }

    public async verifyEmailAndConsumeCode(
        userId: string,
        codeHash: string,
        verifiedAt: Date,
    ): Promise<AuthUserRecord | null> {
        return prisma.$transaction(async (transaction) => {
            const consumed = await transaction.emailVerificationToken.deleteMany({
                where: { userId, tokenHash: codeHash },
            });

            if (consumed.count !== 1) {
                return null;
            }

            const verified = await transaction.user.updateMany({
                where: {
                    id: userId,
                    status: "ACTIVE",
                    emailVerifiedAt: null,
                },
                data: { emailVerifiedAt: verifiedAt },
            });

            if (verified.count !== 1) {
                return null;
            }

            return transaction.user.findUnique({
                where: { id: userId },
                select: authUserSelect,
            });
        });
    }
}
