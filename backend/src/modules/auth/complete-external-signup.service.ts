import AppError from "../../errors/app-error.js";
import { normalizeUsername } from "../../utils/normalize.js";
import type { AuthenticatedSessionService } from "./authenticated-session.service.js";
import {
    MIN_ACCOUNT_AGE,
    validateBirthDate,
} from "./auth.security.js";
import type {
    AuthenticationResult,
    AuthSecurity,
    ClientInformation,
} from "./auth.types.js";
import { IdentityAlreadyExistsError } from "./auth.types.js";
import type { IdentityAuthRepository } from "./identity-auth.repo.js";

export class CompleteExternalSignupUseCase {
    public constructor(
        private readonly identities: IdentityAuthRepository,
        private readonly security: AuthSecurity,
        private readonly authenticatedSessions: AuthenticatedSessionService,
        private readonly termsVersion: string,
    ) {}

    public async execute(
        input: {
            signupToken: string;
            username: string;
            birthDate: string;
        },
        clientInformation: ClientInformation,
    ): Promise<AuthenticationResult> {
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

        const username = input.username.trim();
        const tokenHash = this.security.hashSignupGrantToken(input.signupToken);

        try {
            const user = await this.identities.consumeGrantAndCreateUser({
                tokenHash,
                username,
                usernameNormalized: normalizeUsername(username),
                birthDate: birthDateResult.birthDate,
                termsVersion: this.termsVersion,
                now: new Date(),
            });

            if (!user) {
                throw AppError.badRequest(
                    "The signup session is invalid or expired.",
                    "INVALID_OR_EXPIRED_SIGNUP_GRANT",
                );
            }

            return this.authenticatedSessions.create(user, clientInformation);
        } catch (error) {
            if (error instanceof IdentityAlreadyExistsError) {
                throw AppError.conflict(
                    "The username or provider account is already in use.",
                    "IDENTITY_ALREADY_EXISTS",
                );
            }
            throw error;
        }
    }
}
