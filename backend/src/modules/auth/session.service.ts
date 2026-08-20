import AppError from "../../errors/app-error.js";
import { DefaultAuthSecurity } from "./auth.security.js";
import { SessionRepository } from "./session.repo.js";
import { mapAuthenticatedUser } from "./auth.service.js";
import type { AuthContext, AuthenticationResult, AuthSecurity, SessionView } from "./auth.types.js";

export class AuthenticateSessionUseCase {
    public constructor(
        private readonly sessions: SessionRepository,
        private readonly security: AuthSecurity,
    ) {}

    public async execute(accessToken: string): Promise<AuthContext> {
        let tokenContext;

        try {
            tokenContext = await this.security.verifyAccessToken(accessToken);
        } catch {
            throw AppError.unauthorized(
                "The access token is invalid or expired.",
                "INVALID_ACCESS_TOKEN",
            );
        }

        const principal = await this.sessions.getAuthenticatedPrincipal(
            tokenContext.userId,
            tokenContext.sessionId,
            new Date(),
        );

        if (!principal) {
            throw AppError.unauthorized(
                "The session is no longer active.",
                "INACTIVE_SESSION",
            );
        }

        return principal;
    }
}

export class LogoutUserUseCase {
    public constructor(
        private readonly sessions: SessionRepository,

        private readonly security: AuthSecurity,
    ) {}

    public async execute(refreshToken: string | undefined): Promise<void> {
        if (!refreshToken) {
            return;
        }

        const refreshTokenHash = this.security.hashRefreshToken(refreshToken);

        await this.sessions.revokeSessionByRefreshTokenHash(
            refreshTokenHash,
            new Date(),
        );
    }
}

export class RefreshSessionUseCase {
    public constructor(
        private readonly sessions: SessionRepository,

        private readonly security: AuthSecurity,
    ) {}

    public async execute(
        currentRefreshToken: string,
    ): Promise<AuthenticationResult> {
        const currentTokenHash =
            this.security.hashRefreshToken(currentRefreshToken);

        const now = new Date();

        const session =
            await this.sessions.findSessionByRefreshTokenHash(currentTokenHash);

        if (!session) {
            const consumed =
                await this.sessions.findConsumedSessionByRefreshTokenHash(
                    currentTokenHash,
                );
            if (
                consumed &&
                consumed.revokedAt === null &&
                consumed.expiresAt > now
            ) {
                await this.sessions.revokeSessionById(consumed.sessionId, now);
                throw AppError.conflict(
                    "Refresh token replay was detected and this session was revoked.",
                    "REFRESH_TOKEN_REPLAY",
                );
            }
        }

        if (
            !session ||
            session.revokedAt !== null ||
            session.expiresAt <= now
        ) {
            if (session && session.revokedAt === null) {
                await this.sessions.revokeSessionById(session.id, now);
            }

            throw AppError.unauthorized(
                "The session is invalid or expired.",
                "INVALID_SESSION",
            );
        }

        if (session.user.status !== "ACTIVE") {
            await this.sessions.revokeSessionById(session.id, now);

            throw AppError.unauthorized(
                "The session is no longer active.",
                "INACTIVE_SESSION",
            );
        }

        const nextRefreshToken = this.security.generateRefreshToken();

        const nextRefreshTokenHash =
            this.security.hashRefreshToken(nextRefreshToken);

        const rotated = await this.sessions.rotateSession(
            session.id,
            currentTokenHash,
            nextRefreshTokenHash,
            now,
        );

        if (!rotated) {
            const consumed =
                await this.sessions.findConsumedSessionByRefreshTokenHash(
                    currentTokenHash,
                );
            if (consumed && consumed.sessionId === session.id) {
                await this.sessions.revokeSessionById(session.id, now);
                throw AppError.conflict(
                    "Refresh token replay was detected and this session was revoked.",
                    "REFRESH_TOKEN_REPLAY",
                );
            }
            throw AppError.unauthorized("The session is no longer active.", "INVALID_SESSION");
        }

        const accessToken = await this.security.createAccessToken({
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
}

export class ListSessionsUseCase {
    public constructor(private readonly sessions: SessionRepository) {}

    public async execute(
        userId: string,
        currentSessionId: string,
    ): Promise<SessionView[]> {
        const sessions = await this.sessions.listActiveSessions(userId, new Date());

        return sessions.map((session) => ({
            ...session,
            current: session.id === currentSessionId,
        }));
    }
}

export class RevokeSessionUseCase {
    public constructor(private readonly sessions: SessionRepository) {}

    public async execute(userId: string, sessionId: string): Promise<void> {
        const revoked = await this.sessions.revokeOwnedSession(
            userId,
            sessionId,
            new Date(),
        );

        if (!revoked) {
            throw AppError.notFound(
                "The session was not found.",
                "SESSION_NOT_FOUND",
            );
        }
    }
}

export class RevokeOtherSessionsUseCase {
    public constructor(private readonly sessions: SessionRepository) {}

    public execute(userId: string, currentSessionId: string): Promise<number> {
        return this.sessions.revokeOtherSessions(
            userId,
            currentSessionId,
            new Date(),
        );
    }
}
const sessions = new SessionRepository();
const security = new DefaultAuthSecurity();
const authenticateSession = new AuthenticateSessionUseCase(sessions, security);
const refreshSession = new RefreshSessionUseCase(sessions, security);
const logoutUser = new LogoutUserUseCase(sessions, security);
const listSessions = new ListSessionsUseCase(sessions);
const revokeSession = new RevokeSessionUseCase(sessions);
const revokeOtherSessions = new RevokeOtherSessionsUseCase(sessions);

export const sessionService = {
    authenticate: (accessToken: string) => authenticateSession.execute(accessToken),
    refresh: (refreshToken: string) => refreshSession.execute(refreshToken),
    logout: (refreshToken: string | undefined) => logoutUser.execute(refreshToken),
    list: (userId: string, currentSessionId: string) => listSessions.execute(userId, currentSessionId),
    revoke: (userId: string, sessionId: string) => revokeSession.execute(userId, sessionId),
    revokeOthers: (userId: string, currentSessionId: string) => revokeOtherSessions.execute(userId, currentSessionId),
};
