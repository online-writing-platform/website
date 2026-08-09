import AppError from "../../../errors/app-error.js";

import { normalizeEmail, normalizeUsername } from "../../../utils/normalize.js";

import { IdentityAlreadyExistsError } from "../domain/auth.errors.js";

import {
    getPasswordPolicyViolations,
    MIN_ACCOUNT_AGE,
    validateBirthDate,
} from "../domain/password-policy.js";

import type {
    AuthenticationResult,
    ClientInformation,
    RegisterUserInput,
} from "../domain/auth.types.js";

import { mapAuthenticatedUser } from "./auth-user.mapper.js";

import type { AuthSecurity, AuthStore } from "./auth.ports.js";

import { createSessionMaterial } from "./session-material.js";

import type { EmailVerificationService } from "./email-verification.service.js";

export class RegisterUserUseCase {
    public constructor(
        private readonly store: AuthStore,

        private readonly security: AuthSecurity,

        private readonly emailVerification: EmailVerificationService,

        private readonly termsVersion: string,
    ) {}

    public async execute(
        input: RegisterUserInput,
        clientInformation: ClientInformation,
    ): Promise<AuthenticationResult> {
        const email = normalizeEmail(input.email);

        const username = input.username.trim();

        const usernameNormalized = normalizeUsername(username);

        const birthDateResult = validateBirthDate(input.birthDate);

        if (!birthDateResult.valid) {
            if (birthDateResult.reason === "AGE_REQUIREMENT_NOT_MET") {
                throw AppError.badRequest(
                    `You must be at least ${MIN_ACCOUNT_AGE} years old to create an account.`,
                    "AGE_REQUIREMENT_NOT_MET",
                );
            }

            throw AppError.badRequest(
                "Birth date is invalid.",
                "INVALID_BIRTH_DATE",
            );
        }

        const violations = getPasswordPolicyViolations(
            input.password,
            username,
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

        const conflict = await this.store.findIdentityConflict(
            email,
            usernameNormalized,
        );

        if (conflict) {
            if (conflict.email === email) {
                throw AppError.conflict(
                    "An account with this email already exists.",
                    "EMAIL_ALREADY_EXISTS",
                );
            }

            throw AppError.conflict(
                "This username is already in use.",
                "USERNAME_ALREADY_EXISTS",
            );
        }

        const passwordHash = await this.security.hashPassword(input.password);

        const sessionMaterial = createSessionMaterial(
            this.security,
            clientInformation,
        );

        let result;

        try {
            result = await this.store.createUserWithSession({
                email,

                username,

                usernameNormalized,

                passwordHash,

                displayName: username,

                birthDate: birthDateResult.birthDate,

                termsVersion: this.termsVersion,

                session: {
                    refreshTokenHash: sessionMaterial.refreshTokenHash,

                    expiresAt: sessionMaterial.expiresAt,

                    ...(sessionMaterial.userAgent
                        ? {
                              userAgent: sessionMaterial.userAgent,
                          }
                        : {}),

                    ...(sessionMaterial.ipAddress
                        ? {
                              ipAddress: sessionMaterial.ipAddress,
                          }
                        : {}),
                },
            });
        } catch (error) {
            if (error instanceof IdentityAlreadyExistsError) {
                throw AppError.conflict(
                    "The email or username is already in use.",
                    "IDENTITY_ALREADY_EXISTS",
                );
            }

            throw error;
        }

        const accessToken = await this.security.createAccessToken({
            userId: result.user.id,

            sessionId: result.sessionId,
        });

        await this.emailVerification.sendInitial(
            result.user.id,
            result.user.email,
        );

        return {
            user: mapAuthenticatedUser(result.user),

            accessToken,

            refreshToken: sessionMaterial.refreshToken,

            sessionExpiresAt: sessionMaterial.expiresAt,
        };
    }
}
