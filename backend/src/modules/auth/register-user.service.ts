import AppError from "../../errors/app-error.js";
import { normalizeEmail, normalizeUsername } from "../../utils/normalize.js";
import type { AuthRepository } from "./auth.repo.js";
import {
    getPasswordPolicyViolations,
    MIN_ACCOUNT_AGE,
    validateBirthDate,
} from "./auth.security.js";
import type { EmailVerificationService } from "./email-verification.service.js";
import type {
    AuthSecurity,
    RegistrationResult,
    RegisterUserInput,
} from "./auth.types.js";
import { IdentityAlreadyExistsError } from "./auth.types.js";

export class RegisterUserUseCase {
    public constructor(
        private readonly users: AuthRepository,
        private readonly security: AuthSecurity,
        private readonly emailVerification: EmailVerificationService,
        private readonly termsVersion: string,
    ) {}

    public async execute(input: RegisterUserInput): Promise<RegistrationResult> {
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
                { violations },
            );
        }

        const conflict = await this.users.findIdentityConflict(
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
        let user;

        try {
            user = await this.users.createUser({
                email,
                username,
                usernameNormalized,
                passwordHash,
                displayName: username,
                birthDate: birthDateResult.birthDate,
                termsVersion: this.termsVersion,
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

        const delivered = await this.emailVerification.sendInitial(
            user.id,
            user.email,
        );

        return {
            email: user.email,
            verificationRequired: true,
            deliveryStatus: delivered ? "sent" : "failed",
        };
    }
}
