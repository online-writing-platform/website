import AppError from "../../../errors/app-error.js";

import type { AuthContext } from "../domain/auth.types.js";

import type { AuthSecurity, AuthStore } from "./auth.ports.js";

export class AuthenticateSessionUseCase {
    public constructor(
        private readonly store: AuthStore,
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

        const principal = await this.store.getAuthenticatedPrincipal(
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
