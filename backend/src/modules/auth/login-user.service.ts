import AppError from "../../errors/app-error.js";
import { normalizeEmail, normalizeUsername } from "../../utils/normalize.js";
import type { AuthRepository } from "./auth.repo.js";
import type { AuthenticatedSessionService } from "./authenticated-session.service.js";
import type {
    AuthenticationResult,
    AuthSecurity,
    ClientInformation,
    LoginUserInput,
} from "./auth.types.js";

export class LoginUserUseCase {
    public constructor(
        private readonly users: AuthRepository,
        private readonly security: AuthSecurity,
        private readonly authenticatedSessions: AuthenticatedSessionService,
    ) {}

    public async execute(
        input: LoginUserInput,
        clientInformation: ClientInformation,
    ): Promise<AuthenticationResult> {
        const identifier = input.identifier.trim();
        const user = await this.users.findUserForLogin(
            normalizeEmail(identifier),
            normalizeUsername(identifier),
        );

        if (!user) {
            throw AppError.unauthorized(
                "The email, username, or password is incorrect.",
                "INVALID_CREDENTIALS",
            );
        }

        const passwordIsValid = await this.security.verifyPassword(
            user.passwordHash,
            input.password,
        );

        if (!passwordIsValid || user.status === "DELETED") {
            throw AppError.unauthorized(
                "The email, username, or password is incorrect.",
                "INVALID_CREDENTIALS",
            );
        }

        if (user.status === "SUSPENDED") {
            throw AppError.forbidden(
                "This account has been suspended.",
                "ACCOUNT_SUSPENDED",
            );
        }

        if (user.emailVerifiedAt === null) {
            throw AppError.forbidden(
                "Email verification is required before signing in.",
                "EMAIL_VERIFICATION_REQUIRED",
                { email: user.email },
            );
        }

        return this.authenticatedSessions.create(user, clientInformation);
    }
}
