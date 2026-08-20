import env from "../../config/env.js";
import logger from "../../config/logger.js";
import AppError from "../../errors/app-error.js";
import { normalizeEmail, normalizeUsername } from "../../utils/normalize.js";
import { DefaultPasswordRecoveryEmailSender } from "./auth.email.js";
import { DefaultAuthSecurity, getPasswordPolicyViolations } from "./auth.security.js";
import { AccountRepository } from "./account.repo.js";
import { PasswordRepository } from "./password.repo.js";
import type { AuthLogger, AuthSecurity, PasswordRecoveryEmailSender } from "./auth.types.js";

export class ChangePasswordUseCase {
    public constructor(
        private readonly accounts: AccountRepository,
        private readonly passwords: PasswordRepository,
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
        const user = await this.accounts.findAccountSecurityUser(userId);

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

        const changed = await this.passwords.changePasswordAndRevokeOtherSessions(
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

interface PasswordResetOptions {
    ttlMinutes: number;
    resendCooldownSeconds: number;
}

export class RequestPasswordResetUseCase {
    public constructor(
        private readonly passwords: PasswordRepository,

        private readonly security: AuthSecurity,

        private readonly emailSender: PasswordRecoveryEmailSender,

        private readonly logger: AuthLogger,

        private readonly options: PasswordResetOptions,
    ) {}

    private calculateExpiration(now: Date): Date {
        return new Date(now.getTime() + this.options.ttlMinutes * 60 * 1000);
    }

    private isInsideCooldown(sentAt: Date, now: Date): boolean {
        return (
            now.getTime() - sentAt.getTime() <
            this.options.resendCooldownSeconds * 1000
        );
    }

    public async execute(identifierInput: string): Promise<void> {
        const identifier = identifierInput.trim();

        const user = await this.passwords.findPasswordResetUser(
            normalizeEmail(identifier),

            normalizeUsername(identifier),
        );

        if (!user || user.status === "DELETED") {
            return;
        }

        const now = new Date();

        const existing = await this.passwords.findPasswordResetState(user.id);

        if (existing && this.isInsideCooldown(existing.sentAt, now)) {
            return;
        }

        const token = this.security.generatePasswordResetToken();

        const tokenHash = this.security.hashPasswordResetToken(token);

        await this.passwords.upsertPasswordResetToken(
            user.id,
            tokenHash,
            this.calculateExpiration(now),
            now,
        );

        try {
            await this.emailSender.sendResetLink(user.email, token);
        } catch (error) {
            await this.passwords.deletePasswordResetToken(user.id, tokenHash);

            this.logger.error(
                error,
                {
                    userId: user.id,
                },
                "Failed to send password reset email",
            );
        }
    }
}

export class ResetPasswordUseCase {
    public constructor(
        private readonly passwords: PasswordRepository,

        private readonly security: AuthSecurity,

        private readonly emailSender: PasswordRecoveryEmailSender,

        private readonly logger: AuthLogger,
    ) {}

    public async execute(token: string, newPassword: string): Promise<void> {
        const tokenHash = this.security.hashPasswordResetToken(token);

        const reset = await this.passwords.findPasswordResetByTokenHash(tokenHash);

        if (!reset || reset.user.status === "DELETED") {
            throw AppError.badRequest(
                "The password reset token is invalid or expired.",
                "INVALID_OR_EXPIRED_PASSWORD_RESET_TOKEN",
            );
        }

        const now = new Date();

        if (reset.expiresAt <= now) {
            await this.passwords.deletePasswordResetToken(reset.userId, tokenHash);

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

        const consumed = await this.passwords.resetPasswordAndRevokeSessions(
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
const accounts = new AccountRepository();
const passwords = new PasswordRepository();
const security = new DefaultAuthSecurity();
const emailSender = new DefaultPasswordRecoveryEmailSender();
const authLogger: AuthLogger = {
    error(error, context, message) { logger.error({ ...context, err: error }, message); },
};
const changePassword = new ChangePasswordUseCase(accounts, passwords, security, emailSender, authLogger);
const requestPasswordReset = new RequestPasswordResetUseCase(passwords, security, emailSender, authLogger, { ttlMinutes: env.passwordResetTtlMinutes, resendCooldownSeconds: env.passwordResetResendCooldownSeconds });
const resetPassword = new ResetPasswordUseCase(passwords, security, emailSender, authLogger);

export const passwordService = {
    change: (userId: string, currentSessionId: string, currentPassword: string, newPassword: string) => changePassword.execute(userId, currentSessionId, currentPassword, newPassword),
    requestReset: (identifier: string) => requestPasswordReset.execute(identifier),
    reset: (token: string, newPassword: string) => resetPassword.execute(token, newPassword),
};
