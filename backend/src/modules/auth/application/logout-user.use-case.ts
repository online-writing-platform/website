import type { AuthSecurity, AuthStore } from "./auth.ports.js";

export class LogoutUserUseCase {
    public constructor(
        private readonly store: AuthStore,

        private readonly security: AuthSecurity,
    ) {}

    public async execute(refreshToken: string | undefined): Promise<void> {
        if (!refreshToken) {
            return;
        }

        const refreshTokenHash = this.security.hashRefreshToken(refreshToken);

        await this.store.revokeSessionByRefreshTokenHash(
            refreshTokenHash,
            new Date(),
        );
    }
}
