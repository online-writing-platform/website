import AppError from "../../../errors/app-error.js";
import { normalizeEmail } from "../../../utils/normalize.js";

import { IdentityAlreadyExistsError } from "../domain/auth.errors.js";

import type {
    AccountEmailSender,
    AuthSecurity,
    AuthStore,
} from "./auth.ports.js";

interface EmailChangeOptions {
    ttlMinutes: number;
    resendCooldownSeconds: number;
}

export class RequestEmailChangeUseCase {
    public constructor(
        private readonly store: AuthStore,
        private readonly security: AuthSecurity,
        private readonly sender: AccountEmailSender,
        private readonly options: EmailChangeOptions,
    ) {}

    public async execute(
        userId: string,
        currentPassword: string,
        newEmailInput: string,
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

        const newEmail = normalizeEmail(newEmailInput);

        if (newEmail === user.email) {
            throw AppError.badRequest(
                "The new email address must be different from the current email address.",
                "EMAIL_UNCHANGED",
            );
        }

        const existingUserId = await this.store.findUserIdByEmail(newEmail);

        if (existingUserId && existingUserId !== userId) {
            throw AppError.conflict(
                "An account with this email already exists.",
                "EMAIL_ALREADY_EXISTS",
            );
        }

        const now = new Date();
        const existing = await this.store.findEmailChangeState(userId);

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
            await this.store.upsertEmailChangeToken(
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
            await this.store.deleteEmailChangeToken(userId, tokenHash);

            throw AppError.serviceUnavailable(
                "The confirmation email could not be sent.",
                "EMAIL_DELIVERY_FAILED",
                error,
            );
        }
    }
}
