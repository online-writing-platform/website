import { normalizeEmail, normalizeUsername } from "../../../utils/normalize.js";

import type {
    AuthLogger,
    AuthSecurity,
    AuthStore,
    PasswordRecoveryEmailSender,
} from "./auth.ports.js";

interface PasswordResetOptions {
    ttlMinutes: number;
    resendCooldownSeconds: number;
}

export class RequestPasswordResetUseCase {
    public constructor(
        private readonly store: AuthStore,

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

        const user = await this.store.findPasswordResetUser(
            normalizeEmail(identifier),

            normalizeUsername(identifier),
        );

        if (!user || user.status === "DELETED") {
            return;
        }

        const now = new Date();

        const existing = await this.store.findPasswordResetState(user.id);

        if (existing && this.isInsideCooldown(existing.sentAt, now)) {
            return;
        }

        const token = this.security.generatePasswordResetToken();

        const tokenHash = this.security.hashPasswordResetToken(token);

        await this.store.upsertPasswordResetToken(
            user.id,
            tokenHash,
            this.calculateExpiration(now),
            now,
        );

        try {
            await this.emailSender.sendResetLink(user.email, token);
        } catch (error) {
            await this.store.deletePasswordResetToken(user.id, tokenHash);

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
