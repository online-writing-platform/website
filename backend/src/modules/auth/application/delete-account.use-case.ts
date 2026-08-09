import AppError from "../../../errors/app-error.js";

import type { AuthSecurity, AuthStore } from "./auth.ports.js";

export class DeleteAccountUseCase {
    public constructor(
        private readonly store: AuthStore,
        private readonly security: AuthSecurity,
    ) {}

    public async execute(userId: string, currentPassword: string): Promise<void> {
        const user = await this.store.findAccountSecurityUser(userId);

        if (!user || user.status !== "ACTIVE") {
            throw AppError.notFound(
                "The user account was not found.",
                "USER_NOT_FOUND",
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

        const compactId = userId.replaceAll("-", "");
        const tombstoneUsername = `deleted_${compactId.slice(0, 12)}`;
        const tombstoneEmail = `deleted+${compactId}@invalid.local`;
        const replacementPassword = this.security.generatePasswordResetToken();
        const passwordHash = await this.security.hashPassword(replacementPassword);

        const deleted = await this.store.deleteAccount(
            userId,
            tombstoneEmail,
            tombstoneUsername,
            passwordHash,
            new Date(),
        );

        if (!deleted) {
            throw AppError.conflict(
                "The account could not be deleted because its state changed.",
                "ACCOUNT_STATE_CHANGED",
            );
        }
    }
}
