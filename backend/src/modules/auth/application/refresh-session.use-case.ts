import AppError from "../../../errors/app-error.js";

import type { AuthenticationResult } from "../domain/auth.types.js";

import { mapAuthenticatedUser } from "./auth-user.mapper.js";

import type { AuthSecurity, AuthStore } from "./auth.ports.js";

export class RefreshSessionUseCase {
    public constructor(
        private readonly store: AuthStore,

        private readonly security: AuthSecurity,
    ) {}

    public async execute(
        currentRefreshToken: string,
    ): Promise<AuthenticationResult> {
        const currentTokenHash =
            this.security.hashRefreshToken(currentRefreshToken);

        const now = new Date();

        const session =
            await this.store.findSessionByRefreshTokenHash(currentTokenHash);

        if (
            !session ||
            session.revokedAt !== null ||
            session.expiresAt <= now
        ) {
            if (session && session.revokedAt === null) {
                await this.store.revokeSessionById(session.id, now);
            }

            throw AppError.unauthorized(
                "The session is invalid or expired.",
                "INVALID_SESSION",
            );
        }

        if (session.user.status !== "ACTIVE") {
            await this.store.revokeSessionById(session.id, now);

            throw AppError.unauthorized(
                "The session is no longer active.",
                "INACTIVE_SESSION",
            );
        }

        const nextRefreshToken = this.security.generateRefreshToken();

        const nextRefreshTokenHash =
            this.security.hashRefreshToken(nextRefreshToken);

        const rotated = await this.store.rotateSession(
            session.id,
            currentTokenHash,
            nextRefreshTokenHash,
            now,
        );

        if (!rotated) {
            throw AppError.unauthorized(
                "The session has already been refreshed or revoked.",
                "SESSION_ROTATION_FAILED",
            );
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
