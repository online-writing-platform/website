import AppError from "../../../errors/app-error.js";

import { IdentityAlreadyExistsError } from "../domain/auth.errors.js";

import type { AuthSecurity, AuthStore } from "./auth.ports.js";

export class ConfirmEmailChangeUseCase {
    public constructor(
        private readonly store: AuthStore,
        private readonly security: AuthSecurity,
    ) {}

    public async execute(token: string): Promise<void> {
        const tokenHash = this.security.hashEmailChangeToken(token);
        const change = await this.store.findEmailChangeByTokenHash(tokenHash);
        const now = new Date();

        if (
            !change ||
            change.user.status !== "ACTIVE" ||
            change.expiresAt <= now
        ) {
            if (change) {
                await this.store.deleteEmailChangeToken(change.userId, tokenHash);
            }

            throw AppError.badRequest(
                "The email change token is invalid or expired.",
                "INVALID_OR_EXPIRED_EMAIL_CHANGE_TOKEN",
            );
        }

        const existingUserId = await this.store.findUserIdByEmail(change.newEmail);

        if (existingUserId && existingUserId !== change.userId) {
            await this.store.deleteEmailChangeToken(change.userId, tokenHash);

            throw AppError.conflict(
                "An account with this email already exists.",
                "EMAIL_ALREADY_EXISTS",
            );
        }

        let applied: boolean;

        try {
            applied = await this.store.applyEmailChangeAndRevokeSessions(
                change.userId,
                tokenHash,
                change.newEmail,
                now,
            );
        } catch (error) {
            if (error instanceof IdentityAlreadyExistsError) {
                throw AppError.conflict(
                    "An account with this email already exists.",
                    "EMAIL_ALREADY_EXISTS",
                );
            }

            throw error;
        }

        if (!applied) {
            throw AppError.badRequest(
                "The email change token is invalid or expired.",
                "INVALID_OR_EXPIRED_EMAIL_CHANGE_TOKEN",
            );
        }
    }
}
