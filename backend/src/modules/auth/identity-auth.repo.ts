import { prisma } from "../../db/index.js";
import type { AuthProvider } from "../../generated/prisma/enums.js";
import { isPrismaErrorCode } from "../../utils/prisma-error.js";
import type { AuthUserRecord } from "./auth.types.js";
import { IdentityAlreadyExistsError } from "./auth.types.js";

const authUserSelect = {
    id: true,
    email: true,
    username: true,
    displayName: true,
    bio: true,
    avatarUrl: true,
    emailVerifiedAt: true,
    verifiedAt: true,
    status: true,
    role: true,
    createdAt: true,
    updatedAt: true,
} as const;

export interface SignupGrantRecord {
    id: string;
    provider: AuthProvider;
    providerSubject: string;
    email: string | null;
    emailVerified: boolean;
    displayName: string | null;
    tokenHash: string;
    expiresAt: Date;
}

export class IdentityAuthRepository {
    public async findUserByIdentity(
        provider: AuthProvider,
        providerSubject: string,
    ): Promise<AuthUserRecord | null> {
        const identity = await prisma.authIdentity.findUnique({
            where: {
                provider_providerSubject: {
                    provider,
                    providerSubject,
                },
            },
            select: {
                user: { select: authUserSelect },
            },
        });

        return identity?.user ?? null;
    }

    public async findUserIdByEmail(email: string): Promise<string | null> {
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });

        return user?.id ?? null;
    }

    public async upsertSignupGrant(input: {
        provider: AuthProvider;
        providerSubject: string;
        email: string | null;
        emailVerified: boolean;
        displayName: string | null;
        tokenHash: string;
        expiresAt: Date;
    }): Promise<void> {
        await prisma.authSignupGrant.upsert({
            where: {
                provider_providerSubject: {
                    provider: input.provider,
                    providerSubject: input.providerSubject,
                },
            },
            create: input,
            update: {
                email: input.email,
                emailVerified: input.emailVerified,
                displayName: input.displayName,
                tokenHash: input.tokenHash,
                expiresAt: input.expiresAt,
            },
        });
    }

    public findSignupGrantByTokenHash(
        tokenHash: string,
    ): Promise<SignupGrantRecord | null> {
        return prisma.authSignupGrant.findUnique({
            where: { tokenHash },
            select: {
                id: true,
                provider: true,
                providerSubject: true,
                email: true,
                emailVerified: true,
                displayName: true,
                tokenHash: true,
                expiresAt: true,
            },
        });
    }

    public async consumeGrantAndCreateUser(input: {
        tokenHash: string;
        username: string;
        usernameNormalized: string;
        birthDate: Date;
        termsVersion: string;
        now: Date;
    }): Promise<AuthUserRecord | null> {
        try {
            return await prisma.$transaction(async (transaction) => {
                const grant = await transaction.authSignupGrant.findUnique({
                    where: { tokenHash: input.tokenHash },
                });

                if (!grant || grant.expiresAt <= input.now) {
                    if (grant) {
                        await transaction.authSignupGrant.deleteMany({
                            where: { id: grant.id, tokenHash: input.tokenHash },
                        });
                    }
                    return null;
                }

                const consumed = await transaction.authSignupGrant.deleteMany({
                    where: { id: grant.id, tokenHash: input.tokenHash },
                });
                if (consumed.count !== 1) return null;

                return transaction.user.create({
                    data: {
                        email: grant.email,
                        username: input.username,
                        usernameNormalized: input.usernameNormalized,
                        passwordHash: null,
                        displayName: grant.displayName ?? input.username,
                        birthDate: input.birthDate,
                        emailVerifiedAt: grant.emailVerified ? input.now : null,
                        verifiedAt: input.now,
                        termsVersion: input.termsVersion,
                        authIdentities: {
                            create: {
                                provider: grant.provider,
                                providerSubject: grant.providerSubject,
                                verifiedAt: input.now,
                            },
                        },
                    },
                    select: authUserSelect,
                });
            });
        } catch (error) {
            if (isPrismaErrorCode(error, "P2002")) {
                throw new IdentityAlreadyExistsError();
            }
            throw error;
        }
    }
}
