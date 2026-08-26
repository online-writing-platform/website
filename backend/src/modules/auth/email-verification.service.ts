import AppError from "../../errors/app-error.js";
import { normalizeEmail } from "../../utils/normalize.js";
import type { AuthRepository } from "./auth.repo.js";
import type {
    AuthLogger,
    AuthSecurity,
    AuthUserRecord,
    VerificationEmailSender,
} from "./auth.types.js";

interface EmailVerificationOptions {
    ttlMinutes: number;
    resendCooldownSeconds: number;
    maxAttempts?: number;
}

const DEFAULT_MAX_ATTEMPTS = 5;

interface IssuedVerificationCode {
    code: string;
    codeHash: string;
}

type Clock = () => Date;

export class EmailVerificationService {
    public constructor(
        private readonly users: AuthRepository,
        private readonly security: AuthSecurity,
        private readonly sender: VerificationEmailSender,
        private readonly logger: AuthLogger,
        private readonly options: EmailVerificationOptions,
        private readonly now: Clock = () => new Date(),
    ) {}

    private calculateExpiration(now: Date): Date {
        return new Date(now.getTime() + this.options.ttlMinutes * 60 * 1000);
    }

    private calculateCooldown(sentAt: Date, now: Date): number {
        const elapsedMilliseconds = now.getTime() - sentAt.getTime();
        const cooldownMilliseconds = this.options.resendCooldownSeconds * 1000;

        return Math.max(
            0,
            Math.ceil((cooldownMilliseconds - elapsedMilliseconds) / 1000),
        );
    }

    private async issueCode(
        userId: string,
        email: string,
        enforceCooldown: boolean,
    ): Promise<IssuedVerificationCode> {
        const issuedAt = this.now();

        if (enforceCooldown) {
            const existing = await this.users.findVerificationState(userId);

            if (
                existing &&
                this.calculateCooldown(existing.sentAt, issuedAt) > 0
            ) {
                throw AppError.tooManyRequests(
                    "A verification email was sent recently.",
                    "EMAIL_VERIFICATION_COOLDOWN",
                );
            }
        }

        const code = this.security.generateVerificationCode();
        const codeHash = this.security.hashVerificationCode(email, code);

        await this.users.upsertVerificationToken(
            userId,
            codeHash,
            this.calculateExpiration(issuedAt),
            issuedAt,
        );

        return { code, codeHash };
    }

    private async removeFailedCode(
        userId: string,
        codeHash: string,
    ): Promise<void> {
        try {
            await this.users.deleteVerificationCode(userId, codeHash);
        } catch (cleanupError) {
            this.logger.error(
                cleanupError,
                { userId },
                "Failed to remove an undelivered email verification code",
            );
        }
    }

    public async sendInitial(userId: string, email: string): Promise<boolean> {
        let issued: IssuedVerificationCode | undefined;

        try {
            issued = await this.issueCode(userId, email, false);
            await this.sender.send(email, issued.code);
            return true;
        } catch (error) {
            if (issued) {
                await this.removeFailedCode(userId, issued.codeHash);
            }

            this.logger.error(
                error,
                { userId },
                "Failed to send initial email verification code",
            );
            return false;
        }
    }

    public async resend(emailInput: string): Promise<void> {
        const email = normalizeEmail(emailInput);
        const user = await this.users.findVerificationUserByEmail(email);

        if (
            !user ||
            user.status === "DELETED" ||
            user.emailVerifiedAt !== null
        ) {
            return;
        }

        let issued: IssuedVerificationCode;

        try {
            issued = await this.issueCode(user.id, user.email, true);
        } catch (error) {
            if (
                error instanceof AppError &&
                error.code === "EMAIL_VERIFICATION_COOLDOWN"
            ) {
                return;
            }

            throw error;
        }

        try {
            await this.sender.send(user.email, issued.code);
        } catch (error) {
            await this.removeFailedCode(user.id, issued.codeHash);
            this.logger.error(
                error,
                { userId: user.id },
                "Failed to resend email verification code",
            );
        }
    }

    public async verify(
        emailInput: string,
        code: string,
    ): Promise<AuthUserRecord> {
        const email = normalizeEmail(emailInput);
        const codeHash = this.security.hashVerificationCode(email, code);
        const verification =
            await this.users.findVerificationByEmail(email);

        if (!verification || verification.user.status === "DELETED") {
            throw AppError.badRequest(
                "The email verification code is invalid.",
                "INVALID_EMAIL_VERIFICATION_CODE",
            );
        }

        const verifiedAt = this.now();

        if (verification.expiresAt <= verifiedAt) {
            await this.users.deleteVerificationCode(
                verification.userId,
                verification.tokenHash,
            );

            throw AppError.badRequest(
                "The email verification code has expired.",
                "EMAIL_VERIFICATION_CODE_EXPIRED",
            );
        }

        if (verification.tokenHash !== codeHash) {
            await this.users.recordFailedVerificationAttempt(
                verification.userId,
                verification.tokenHash,
                this.options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
            );

            throw AppError.badRequest(
                "The email verification code is invalid.",
                "INVALID_EMAIL_VERIFICATION_CODE",
            );
        }

        const user = await this.users.verifyEmailAndConsumeCode(
            verification.userId,
            codeHash,
            verifiedAt,
        );

        if (!user) {
            throw AppError.badRequest(
                "The email verification code is invalid.",
                "INVALID_EMAIL_VERIFICATION_CODE",
            );
        }

        return user;
    }
}
