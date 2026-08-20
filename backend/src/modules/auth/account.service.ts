import env from "../../config/env.js";
import AppError from "../../errors/app-error.js";
import { normalizeEmail, normalizeUsername } from "../../utils/normalize.js";
import { DefaultAccountEmailSender } from "./auth.email.js";
import { DefaultAuthSecurity } from "./auth.security.js";
import { AccountRepository } from "./account.repo.js";
import type { AccountEmailSender, AuthSecurity } from "./auth.types.js";
import { IdentityAlreadyExistsError } from "./auth.types.js";

export class ChangeUsernameUseCase {
    public constructor(
        private readonly accounts: AccountRepository,
        private readonly security: AuthSecurity,
    ) {}

    public async execute(
        userId: string,
        currentPassword: string,
        newUsernameInput: string,
    ): Promise<void> {
        const user = await this.accounts.findAccountSecurityUser(userId);

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
            const updated = await this.accounts.updateUsername(
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

export class ConfirmEmailChangeUseCase {
    public constructor(
        private readonly accounts: AccountRepository,
        private readonly security: AuthSecurity,
    ) {}

    public async execute(token: string): Promise<void> {
        const tokenHash = this.security.hashEmailChangeToken(token);
        const change = await this.accounts.findEmailChangeByTokenHash(tokenHash);
        const now = new Date();

        if (
            !change ||
            change.user.status !== "ACTIVE" ||
            change.expiresAt <= now
        ) {
            if (change) {
                await this.accounts.deleteEmailChangeToken(change.userId, tokenHash);
            }

            throw AppError.badRequest(
                "The email change token is invalid or expired.",
                "INVALID_OR_EXPIRED_EMAIL_CHANGE_TOKEN",
            );
        }

        const existingUserId = await this.accounts.findUserIdByEmail(change.newEmail);

        if (existingUserId && existingUserId !== change.userId) {
            await this.accounts.deleteEmailChangeToken(change.userId, tokenHash);

            throw AppError.conflict(
                "An account with this email already exists.",
                "EMAIL_ALREADY_EXISTS",
            );
        }

        let applied: boolean;

        try {
            applied = await this.accounts.applyEmailChangeAndRevokeSessions(
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

export class DeleteAccountUseCase {
    public constructor(
        private readonly accounts: AccountRepository,
        private readonly security: AuthSecurity,
    ) {}

    public async execute(userId: string, currentPassword: string): Promise<void> {
        const user = await this.accounts.findAccountSecurityUser(userId);

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

        const deleted = await this.accounts.deleteAccount(
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

interface EmailChangeOptions {
    ttlMinutes: number;
    resendCooldownSeconds: number;
}

export class RequestEmailChangeUseCase {
    public constructor(
        private readonly accounts: AccountRepository,
        private readonly security: AuthSecurity,
        private readonly sender: AccountEmailSender,
        private readonly options: EmailChangeOptions,
    ) {}

    public async execute(
        userId: string,
        currentPassword: string,
        newEmailInput: string,
    ): Promise<void> {
        const user = await this.accounts.findAccountSecurityUser(userId);

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

        const newEmail = normalizeEmail(newEmailInput);

        if (newEmail === user.email) {
            throw AppError.badRequest(
                "The new email address must be different from the current email address.",
                "EMAIL_UNCHANGED",
            );
        }

        const existingUserId = await this.accounts.findUserIdByEmail(newEmail);

        if (existingUserId && existingUserId !== userId) {
            throw AppError.conflict(
                "An account with this email already exists.",
                "EMAIL_ALREADY_EXISTS",
            );
        }

        const now = new Date();
        const existing = await this.accounts.findEmailChangeState(userId);

        if (
            existing &&
            existing.newEmail === newEmail &&
            now.getTime() - existing.sentAt.getTime() <
                this.options.resendCooldownSeconds * 1000
        ) {
            const retryAfterSeconds = Math.max(
                1,
                Math.ceil(
                    (this.options.resendCooldownSeconds * 1000 -
                        (now.getTime() - existing.sentAt.getTime())) /
                        1000,
                ),
            );

            throw AppError.tooManyRequests(
                "An email change message was sent recently.",
                "EMAIL_CHANGE_COOLDOWN",
                { retryAfterSeconds },
            );
        }

        const token = this.security.generateEmailChangeToken();
        const tokenHash = this.security.hashEmailChangeToken(token);
        const expiresAt = new Date(
            now.getTime() + this.options.ttlMinutes * 60 * 1000,
        );

        try {
            await this.accounts.upsertEmailChangeToken(
                userId,
                newEmail,
                tokenHash,
                expiresAt,
                now,
            );
        } catch (error) {
            if (error instanceof IdentityAlreadyExistsError) {
                throw AppError.conflict(
                    "An account or pending request already uses this email address.",
                    "EMAIL_ALREADY_EXISTS",
                );
            }

            throw error;
        }

        try {
            await this.sender.sendEmailChangeLink(newEmail, token);
        } catch (error) {
            await this.accounts.deleteEmailChangeToken(userId, tokenHash);

            throw AppError.serviceUnavailable(
                "The confirmation email could not be sent.",
                "EMAIL_DELIVERY_FAILED",
                error,
            );
        }
    }
}
const accounts = new AccountRepository();
const security = new DefaultAuthSecurity();
const emailSender = new DefaultAccountEmailSender();
const changeUsername = new ChangeUsernameUseCase(accounts, security);
const requestEmailChange = new RequestEmailChangeUseCase(accounts, security, emailSender, { ttlMinutes: env.emailChangeTtlMinutes, resendCooldownSeconds: env.emailChangeResendCooldownSeconds });
const confirmEmailChange = new ConfirmEmailChangeUseCase(accounts, security);
const deleteAccount = new DeleteAccountUseCase(accounts, security);

export const accountService = {
    changeUsername: (userId: string, currentPassword: string, newUsername: string) => changeUsername.execute(userId, currentPassword, newUsername),
    requestEmailChange: (userId: string, currentPassword: string, newEmail: string) => requestEmailChange.execute(userId, currentPassword, newEmail),
    confirmEmailChange: (token: string) => confirmEmailChange.execute(token),
    deleteAccount: (userId: string, currentPassword: string) => deleteAccount.execute(userId, currentPassword),
};
