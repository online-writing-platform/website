import AppError from "../../../errors/app-error.js";

import type { AuthContext } from "../domain/auth.types.js";

import type { AuthSecurity, AuthStore } from "./auth.ports.js";

export class AuthenticateSessionUseCase {
    public constructor(
        private readonly store: AuthStore,

        private readonly security: AuthSecurity,
    ) {}

    public async execute(accessToken: string): Promise<AuthContext> {
        let context: AuthContext;

        try {
            context = await this.security.verifyAccessToken(accessToken);
        } catch {
            throw AppError.unauthorized(
                "The access token is invalid or expired.",
                "INVALID_ACCESS_TOKEN",
            );
        }

        const active = await this.store.isSessionActive(
            context.userId,
            context.sessionId,
            new Date(),
        );

        if (!active) {
            throw AppError.unauthorized(
                "The session is no longer active.",
                "INACTIVE_SESSION",
            );
        }

        return context;
    }
}
