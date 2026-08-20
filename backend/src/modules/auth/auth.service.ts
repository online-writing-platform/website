import env from "../../config/env.js";
import logger from "../../config/logger.js";
import AppError from "../../errors/app-error.js";
import { normalizeEmail, normalizeUsername } from "../../utils/normalize.js";
import { DefaultVerificationEmailSender } from "./auth.email.js";
import { EmailVerificationService } from "./email-verification.service.js";
import { DefaultAuthSecurity, getPasswordPolicyViolations, MIN_ACCOUNT_AGE, validateBirthDate } from "./auth.security.js";
import { AuthRepository } from "./auth.repo.js";
import { SessionRepository } from "./session.repo.js";
import type { AuthenticatedUser, AuthenticationResult, AuthLogger, AuthSecurity, AuthUserRecord, ClientInformation, LoginUserInput, RegisterUserInput } from "./auth.types.js";
import { IdentityAlreadyExistsError } from "./auth.types.js";

export class LoginUserUseCase {
    public constructor(
        private readonly users: AuthRepository,

        private readonly sessions: SessionRepository,

        private readonly security: AuthSecurity,
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

        if (!passwordIsValid) {
            throw AppError.unauthorized(
                "The email, username, or password is incorrect.",
                "INVALID_CREDENTIALS",
            );
        }

        if (user.status === "DELETED") {
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

        const sessionMaterial = createSessionMaterial(
            this.security,
            clientInformation,
        );

        const session = await this.sessions.createSession({
            userId: user.id,

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
        });

        const accessToken = await this.security.createAccessToken({
            userId: user.id,

            sessionId: session.id,
        });

        return {
            user: mapAuthenticatedUser(user),

            accessToken,

            refreshToken: sessionMaterial.refreshToken,

            sessionExpiresAt: sessionMaterial.expiresAt,
        };
    }
}

export class RegisterUserUseCase {
    public constructor(
        private readonly users: AuthRepository,

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

        const sessionMaterial = createSessionMaterial(
            this.security,
            clientInformation,
        );

        let result;

        try {
            result = await this.users.createUserWithSession({
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

export function mapAuthenticatedUser(user: AuthUserRecord): AuthenticatedUser {
    return {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerifiedAt !== null,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

export interface SessionMaterial {
    refreshToken: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
}

function sanitizeClientInformation(
    clientInformation: ClientInformation,
): ClientInformation {
    const userAgent = clientInformation.userAgent?.trim().slice(0, 512);

    const ipAddress = clientInformation.ipAddress?.trim().slice(0, 45);

    return {
        ...(userAgent
            ? {
                  userAgent,
              }
            : {}),

        ...(ipAddress
            ? {
                  ipAddress,
              }
            : {}),
    };
}

export function createSessionMaterial(
    security: AuthSecurity,
    clientInformation: ClientInformation,
): SessionMaterial {
    const refreshToken = security.generateRefreshToken();

    const refreshTokenHash = security.hashRefreshToken(refreshToken);

    const safeClientInformation = sanitizeClientInformation(clientInformation);

    return {
        refreshToken,

        refreshTokenHash,

        expiresAt: security.calculateSessionExpiration(),

        ...safeClientInformation,
    };
}
const users = new AuthRepository();
const sessions = new SessionRepository();
const security = new DefaultAuthSecurity();
const verificationEmailSender = new DefaultVerificationEmailSender();
const authLogger: AuthLogger = {
    error(error, context, message) {
        logger.error({ ...context, err: error }, message);
    },
};
const emailVerification = new EmailVerificationService(
    users, security, verificationEmailSender, authLogger,
    { ttlHours: env.emailVerificationTtlHours, resendCooldownSeconds: env.emailVerificationResendCooldownSeconds },
);
const loginUser = new LoginUserUseCase(users, sessions, security);
const registerUser = new RegisterUserUseCase(users, security, emailVerification, env.termsVersion);

export const authService = {
    register: (input: RegisterUserInput, client: ClientInformation) => registerUser.execute(input, client),
    login: (input: LoginUserInput, client: ClientInformation) => loginUser.execute(input, client),
    verifyEmail: (token: string) => emailVerification.verify(token),
    resendVerificationEmail: (userId: string) => emailVerification.resend(userId),
};
