import AppError from "../../../errors/app-error.js";

import { normalizeEmail, normalizeUsername } from "../../../utils/normalize.js";

import type {
    AuthenticationResult,
    ClientInformation,
    LoginUserInput,
} from "../domain/auth.types.js";

import { mapAuthenticatedUser } from "./auth-user.mapper.js";

import type { AuthSecurity, AuthStore } from "./auth.ports.js";

import { createSessionMaterial } from "./session-material.js";

export class LoginUserUseCase {
    public constructor(
        private readonly store: AuthStore,

        private readonly security: AuthSecurity,
    ) {}

    public async execute(
        input: LoginUserInput,
        clientInformation: ClientInformation,
    ): Promise<AuthenticationResult> {
        const identifier = input.identifier.trim();

        const user = await this.store.findUserForLogin(
            normalizeEmail(identifier),

            normalizeUsername(identifier),
        );

        if (!user) {
            throw AppError.unauthorized(
                "The email, username, or password is incorrect.",
                "INVALID_CREDENTIALS",
            );
        }

        const passwordIsValid = await this.security.verifyPassword(
            user.passwordHash,
            input.password,
        );

        if (!passwordIsValid) {
            throw AppError.unauthorized(
                "The email, username, or password is incorrect.",
                "INVALID_CREDENTIALS",
            );
        }

        if (user.status === "DELETED") {
            throw AppError.unauthorized(
                "The email, username, or password is incorrect.",
                "INVALID_CREDENTIALS",
            );
        }

        if (user.status === "SUSPENDED") {
            throw AppError.forbidden(
                "This account has been suspended.",
                "ACCOUNT_SUSPENDED",
            );
        }

        const sessionMaterial = createSessionMaterial(
            this.security,
            clientInformation,
        );

        const session = await this.store.createSession({
            userId: user.id,

            refreshTokenHash: sessionMaterial.refreshTokenHash,

            expiresAt: sessionMaterial.expiresAt,

            ...(sessionMaterial.userAgent
                ? {
                      userAgent: sessionMaterial.userAgent,
                  }
                : {}),

            ...(sessionMaterial.ipAddress
                ? {
                      ipAddress: sessionMaterial.ipAddress,
                  }
                : {}),
        });

        const accessToken = await this.security.createAccessToken({
            userId: user.id,

            sessionId: session.id,
        });

        return {
            user: mapAuthenticatedUser(user),

            accessToken,

            refreshToken: sessionMaterial.refreshToken,

            sessionExpiresAt: sessionMaterial.expiresAt,
        };
    }
}
