import { prisma } from "../../db/index.js";
import { isPrismaErrorCode } from "../../utils/prisma-error.js";
import type { CreateSessionInput, SessionWithUserRecord, AuthContext, SessionView } from "./auth.types.js";

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

export class SessionRepository {
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
}
