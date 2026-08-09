import AppError from "../../../errors/app-error.js";

import { getPasswordPolicyViolations } from "../domain/password-policy.js";

import type {
    AuthLogger,
    AuthSecurity,
    AuthStore,
    PasswordRecoveryEmailSender,
} from "./auth.ports.js";

export class ChangePasswordUseCase {
    public constructor(
        private readonly store: AuthStore,
        private readonly security: AuthSecurity,
        private readonly emailSender: PasswordRecoveryEmailSender,
        private readonly logger: AuthLogger,
    ) {}

    public async execute(
        userId: string,
        currentSessionId: string,
        currentPassword: string,
        newPassword: string,
    ): Promise<void> {
        const user = await this.store.findAccountSecurityUser(userId);

        if (!user || user.status !== "ACTIVE") {
            throw AppError.unauthorized(
                "The account is no longer active.",
                "INACTIVE_ACCOUNT",
            );
        }

        const currentPasswordValid = await this.security.verifyPassword(
            user.passwordHash,
            currentPassword,
        );

        if (!currentPasswordValid) {
            throw AppError.unauthorized(
                "The current password is incorrect.",
                "INVALID_CURRENT_PASSWORD",
            );
        }

        const samePassword = await this.security.verifyPassword(
            user.passwordHash,
            newPassword,
        );

        if (samePassword) {
            throw AppError.badRequest(
                "The new password must be different from the current password.",
                "PASSWORD_UNCHANGED",
            );
        }

        const violations = getPasswordPolicyViolations(newPassword, user.username);

        if (violations.length > 0) {
            throw AppError.badRequest(
                "The password does not meet the required policy.",
                "PASSWORD_POLICY_VIOLATION",
                { violations },
            );
        }

        const passwordHash = await this.security.hashPassword(newPassword);

        const changed = await this.store.changePasswordAndRevokeOtherSessions(
            userId,
            currentSessionId,
            passwordHash,
            new Date(),
        );

        if (!changed) {
            throw AppError.conflict(
                "The account changed while the request was being processed.",
                "ACCOUNT_STATE_CHANGED",
            );
        }

        try {
            await this.emailSender.sendPasswordChangedNotice(user.email);
        } catch (error) {
            this.logger.error(
                error,
                { userId },
                "Failed to send password changed notification",
            );
        }
    }
}
