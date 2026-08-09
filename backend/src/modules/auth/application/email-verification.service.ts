import AppError from "../../../errors/app-error.js";

import type {
    AuthLogger,
    AuthSecurity,
    AuthStore,
    VerificationEmailSender,
} from "./auth.ports.js";

interface EmailVerificationOptions {
    ttlHours: number;
    resendCooldownSeconds: number;
}

interface IssuedVerification {
    token: string;
    tokenHash: string;
}

export class EmailVerificationService {
    public constructor(
        private readonly store: AuthStore,

        private readonly security: AuthSecurity,

        private readonly sender: VerificationEmailSender,

        private readonly logger: AuthLogger,

        private readonly options: EmailVerificationOptions,
    ) {}

    private calculateExpiration(now: Date): Date {
        return new Date(now.getTime() + this.options.ttlHours * 60 * 60 * 1000);
    }

    private calculateCooldown(sentAt: Date, now: Date): number {
        const elapsedMilliseconds = now.getTime() - sentAt.getTime();

        const cooldownMilliseconds = this.options.resendCooldownSeconds * 1000;

        return Math.max(
            0,
            Math.ceil((cooldownMilliseconds - elapsedMilliseconds) / 1000),
        );
    }

    private async issueToken(
        userId: string,
        enforceCooldown: boolean,
    ): Promise<IssuedVerification> {
        const now = new Date();

        if (enforceCooldown) {
            const existing = await this.store.findVerificationState(userId);

            if (existing) {
                const retryAfterSeconds = this.calculateCooldown(
                    existing.sentAt,
                    now,
                );

                if (retryAfterSeconds > 0) {
                    throw AppError.tooManyRequests(
                        "A verification email was sent recently.",
                        "EMAIL_VERIFICATION_COOLDOWN",
                        {
                            retryAfterSeconds,
                        },
                    );
                }
            }
        }

        const token = this.security.generateVerificationToken();

        const tokenHash = this.security.hashVerificationToken(token);

        await this.store.upsertVerificationToken(
            userId,
            tokenHash,
            this.calculateExpiration(now),
            now,
        );

        return {
            token,
            tokenHash,
        };
    }

    public async sendInitial(userId: string, email: string): Promise<void> {
        try {
            const { token } = await this.issueToken(userId, false);

            await this.sender.send(email, token);
        } catch (error) {
            this.logger.error(
                error,
                {
                    userId,
                },
                "Failed to send initial email verification",
            );
        }
    }

    public async resend(userId: string): Promise<void> {
        const user = await this.store.findVerificationUser(userId);

        if (!user || user.status === "DELETED") {
            throw AppError.notFound(
                "The user account was not found.",
                "USER_NOT_FOUND",
            );
        }

        if (user.emailVerifiedAt !== null) {
            throw AppError.conflict(
                "The email address is already verified.",
                "EMAIL_ALREADY_VERIFIED",
            );
        }

        const { token, tokenHash } = await this.issueToken(userId, true);

        try {
            await this.sender.send(user.email, token);
        } catch (error) {
            await this.store.deleteVerificationToken(userId, tokenHash);

            this.logger.error(
                error,
                {
                    userId,
                },
                "Failed to resend email verification",
            );

            throw AppError.serviceUnavailable(
                "The verification email could not be sent.",
                "EMAIL_DELIVERY_FAILED",
                error,
            );
        }
    }

    public async verify(token: string): Promise<void> {
        const tokenHash = this.security.hashVerificationToken(token);

        const verification =
            await this.store.findVerificationByTokenHash(tokenHash);

        if (!verification || verification.user.status === "DELETED") {
            throw AppError.badRequest(
                "The verification token is invalid.",
                "INVALID_EMAIL_VERIFICATION_TOKEN",
            );
        }

        const now = new Date();

        if (verification.expiresAt <= now) {
            await this.store.deleteVerificationToken(
                verification.userId,
                tokenHash,
            );

            throw AppError.badRequest(
                "The verification token has expired.",
                "EMAIL_VERIFICATION_TOKEN_EXPIRED",
            );
        }

        await this.store.verifyEmailAndConsumeTokens(verification.userId, now);
    }
}
