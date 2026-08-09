import AppError from "../../../errors/app-error.js";
import { normalizeUsername } from "../../../utils/normalize.js";

import { IdentityAlreadyExistsError } from "../domain/auth.errors.js";

import type { AuthSecurity, AuthStore } from "./auth.ports.js";

export class ChangeUsernameUseCase {
    public constructor(
        private readonly store: AuthStore,
        private readonly security: AuthSecurity,
    ) {}

    public async execute(
        userId: string,
        currentPassword: string,
        newUsernameInput: string,
    ): Promise<void> {
        const user = await this.store.findAccountSecurityUser(userId);

        if (!user || user.status !== "ACTIVE") {
            throw AppError.unauthorized(
                "The account is no longer active.",
                "INACTIVE_ACCOUNT",
            );
        }

        const passwordValid = await this.security.verifyPassword(
            user.passwordHash,
            currentPassword,
        );

        if (!passwordValid) {
            throw AppError.unauthorized(
                "The current password is incorrect.",
                "INVALID_CURRENT_PASSWORD",
            );
        }

        const newUsername = newUsernameInput.trim();
        const usernameNormalized = normalizeUsername(newUsername);

        if (usernameNormalized === user.usernameNormalized) {
            return;
        }

        try {
            const updated = await this.store.updateUsername(
                userId,
                newUsername,
                usernameNormalized,
            );

            if (!updated) {
                throw AppError.notFound(
                    "The user account was not found.",
                    "USER_NOT_FOUND",
                );
            }
        } catch (error) {
            if (error instanceof IdentityAlreadyExistsError) {
                throw AppError.conflict(
                    "This username is already in use.",
                    "USERNAME_ALREADY_EXISTS",
                );
            }

            throw error;
        }
    }
}
