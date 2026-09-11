import AppError from "../../errors/app-error.js";
import type { AuthProvider } from "../../generated/prisma/enums.js";
import type { AuthenticatedSessionService } from "./authenticated-session.service.js";
import type { AuthSecurity, ClientInformation } from "./auth.types.js";
import type { ExternalAuthResult } from "./external-auth.types.js";
import type { IdentityAuthRepository } from "./identity-auth.repo.js";
import type { PhoneOtpRepository } from "./phone-otp.repo.js";
import type { SmsSender } from "./sms.sender.js";

interface PhoneAuthOptions {
    ttlMinutes: number;
    resendCooldownSeconds: number;
    maxAttempts: number;
    signupGrantTtlMinutes: number;
}

export class PhoneAuthService {
    public constructor(
        private readonly challenges: PhoneOtpRepository,
        private readonly identities: IdentityAuthRepository,
        private readonly security: AuthSecurity,
        private readonly smsSender: SmsSender,
        private readonly authenticatedSessions: AuthenticatedSessionService,
        private readonly options: PhoneAuthOptions,
        private readonly now: () => Date = () => new Date(),
    ) {}

    public async requestCode(phoneNumber: string): Promise<void> {
        const now = this.now();
        const existing = await this.challenges.findByPhoneNumber(phoneNumber);

        if (existing) {
            const elapsed = now.getTime() - existing.sentAt.getTime();
            const cooldown = this.options.resendCooldownSeconds * 1000;

            if (elapsed < cooldown) {
                throw AppError.tooManyRequests(
                    "A verification code was sent recently.",
                    "PHONE_OTP_COOLDOWN",
                    {
                        retryAfterSeconds: Math.max(
                            1,
                            Math.ceil((cooldown - elapsed) / 1000),
                        ),
                    },
                );
            }
        }

        const code = this.security.generateVerificationCode();
        const codeHash = this.security.hashPhoneOtpCode(phoneNumber, code);
        const expiresAt = new Date(
            now.getTime() + this.options.ttlMinutes * 60_000,
        );

        await this.challenges.saveChallenge({
            phoneNumber,
            codeHash,
            expiresAt,
            sentAt: now,
        });

        try {
            await this.smsSender.sendOtp(phoneNumber, code);
        } catch (error) {
            await this.challenges.deleteChallenge(phoneNumber, codeHash);
            throw AppError.serviceUnavailable(
                "The verification SMS could not be sent.",
                "PHONE_OTP_DELIVERY_FAILED",
                error,
            );
        }
    }

    public async verifyCode(
        phoneNumber: string,
        code: string,
        clientInformation: ClientInformation,
    ): Promise<ExternalAuthResult> {
        const challenge = await this.challenges.findByPhoneNumber(phoneNumber);
        const now = this.now();

        if (!challenge) {
            throw AppError.badRequest(
                "The verification code is invalid or expired.",
                "INVALID_OR_EXPIRED_PHONE_OTP",
            );
        }

        if (challenge.expiresAt <= now) {
            await this.challenges.deleteChallenge(
                phoneNumber,
                challenge.codeHash,
            );
            throw AppError.badRequest(
                "The verification code is invalid or expired.",
                "INVALID_OR_EXPIRED_PHONE_OTP",
            );
        }

        if (
            !this.security.verifyPhoneOtpCode(
                phoneNumber,
                code,
                challenge.codeHash,
            )
        ) {
            await this.challenges.recordFailedAttempt(
                phoneNumber,
                challenge.codeHash,
                this.options.maxAttempts,
            );
            throw AppError.badRequest(
                "The verification code is invalid or expired.",
                "INVALID_OR_EXPIRED_PHONE_OTP",
            );
        }

        const consumed = await this.challenges.consumeChallenge(
            phoneNumber,
            challenge.codeHash,
            now,
        );
        if (!consumed) {
            throw AppError.badRequest(
                "The verification code is invalid or expired.",
                "INVALID_OR_EXPIRED_PHONE_OTP",
            );
        }

        const provider: AuthProvider = "PHONE";
        const user = await this.identities.findUserByIdentity(
            provider,
            phoneNumber,
        );

        if (user) {
            if (user.status === "SUSPENDED") {
                throw AppError.forbidden(
                    "This account has been suspended.",
                    "ACCOUNT_SUSPENDED",
                );
            }
            if (user.status !== "ACTIVE") {
                throw AppError.unauthorized(
                    "The account is no longer active.",
                    "INACTIVE_ACCOUNT",
                );
            }

            return {
                status: "authenticated",
                authentication: await this.authenticatedSessions.create(
                    user,
                    clientInformation,
                ),
            };
        }

        const signupToken = this.security.generateSignupGrantToken();
        await this.identities.upsertSignupGrant({
            provider,
            providerSubject: phoneNumber,
            email: null,
            emailVerified: false,
            displayName: null,
            tokenHash: this.security.hashSignupGrantToken(signupToken),
            expiresAt: new Date(
                now.getTime() + this.options.signupGrantTtlMinutes * 60_000,
            ),
        });

        return {
            status: "signup_required",
            provider: "PHONE",
            signupToken,
            email: null,
            displayName: null,
        };
    }
}
