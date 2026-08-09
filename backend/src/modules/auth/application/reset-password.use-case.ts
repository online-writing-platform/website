import AppError from "../../../errors/app-error.js";

import { getPasswordPolicyViolations } from "../domain/password-policy.js";

import type {
    AuthLogger,
    AuthSecurity,
    AuthStore,
    PasswordRecoveryEmailSender,
} from "./auth.ports.js";

export class ResetPasswordUseCase {
    public constructor(
        private readonly store: AuthStore,

        private readonly security: AuthSecurity,

        private readonly emailSender: PasswordRecoveryEmailSender,

        private readonly logger: AuthLogger,
    ) {}

    public async execute(token: string, newPassword: string): Promise<void> {
        const tokenHash = this.security.hashPasswordResetToken(token);

        const reset = await this.store.findPasswordResetByTokenHash(tokenHash);

        if (!reset || reset.user.status === "DELETED") {
            throw AppError.badRequest(
                "The password reset token is invalid or expired.",
                "INVALID_OR_EXPIRED_PASSWORD_RESET_TOKEN",
            );
        }

        const now = new Date();

        if (reset.expiresAt <= now) {
            await this.store.deletePasswordResetToken(reset.userId, tokenHash);

            throw AppError.badRequest(
                "The password reset token is invalid or expired.",
                "INVALID_OR_EXPIRED_PASSWORD_RESET_TOKEN",
            );
        }

        const violations = getPasswordPolicyViolations(
            newPassword,
            reset.user.username,
        );

        if (violations.length > 0) {
            throw AppError.badRequest(
                "The password does not meet the required policy.",
                "PASSWORD_POLICY_VIOLATION",
                {
                    violations,
                },
            );
        }

        const passwordHash = await this.security.hashPassword(newPassword);

        const consumed = await this.store.resetPasswordAndRevokeSessions(
            reset.userId,
            tokenHash,
            passwordHash,
            now,
        );

        if (!consumed) {
            throw AppError.badRequest(
                "The password reset token is invalid or expired.",
                "INVALID_OR_EXPIRED_PASSWORD_RESET_TOKEN",
            );
        }

        try {
            await this.emailSender.sendPasswordChangedNotice(reset.user.email);
        } catch (error) {
            this.logger.error(
                error,
                {
                    userId: reset.userId,
                },
                "Failed to send password changed notification",
            );
        }
    }
}
