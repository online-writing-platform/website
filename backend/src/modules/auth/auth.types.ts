export type UserStatusValue = "ACTIVE" | "SUSPENDED" | "DELETED";

export type UserRoleValue = "USER" | "MODERATOR" | "ADMIN";

export interface AccessTokenContext {
    userId: string;
    sessionId: string;
}

export interface AuthContext extends AccessTokenContext {
    role: UserRoleValue;
    emailVerified: boolean;
}

export interface ClientInformation {
    userAgent?: string;
    ipAddress?: string;
}

export interface RegisterUserInput {
    username: string;
    email: string;
    password: string;
    birthDate: string;
    acceptTerms: true;
}

export interface LoginUserInput {
    identifier: string;
    password: string;
}

export interface AuthUserRecord {
    id: string;
    email: string;
    username: string;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    emailVerifiedAt: Date | null;
    status: UserStatusValue;
    role: UserRoleValue;
    createdAt: Date;
    updatedAt: Date;
}

export interface AuthUserWithPassword extends AuthUserRecord {
    passwordHash: string;
}

export interface AuthenticatedUser {
    id: string;
    email: string;
    username: string;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    emailVerified: boolean;
    role: UserRoleValue;
    createdAt: Date;
    updatedAt: Date;
}

export interface AuthenticationResult {
    user: AuthenticatedUser;
    accessToken: string;
    refreshToken: string;
    sessionExpiresAt: Date;
}

export interface SessionView {
    id: string;
    userAgent: string | null;
    ipAddress: string | null;
    lastUsedAt: Date;
    expiresAt: Date;
    createdAt: Date;
    current: boolean;
}

export interface IdentityConflictRecord {
    email: string;
    usernameNormalized: string;
}

export interface CreateUserWithSessionInput {
    email: string;
    username: string;
    usernameNormalized: string;
    passwordHash: string;
    displayName: string;
    birthDate: Date;
    termsVersion: string;
    session: {
        refreshTokenHash: string;
        expiresAt: Date;
        userAgent?: string;
        ipAddress?: string;
    };
}

export interface CreateSessionInput {
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
}

export interface SessionWithUserRecord {
    id: string;
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    revokedAt: Date | null;
    user: AuthUserRecord;
}

export interface ConsumedRefreshSessionRecord {
    sessionId: string;
    expiresAt: Date;
    revokedAt: Date | null;
}

export interface VerificationUserRecord {
    email: string;
    emailVerifiedAt: Date | null;
    status: UserStatusValue;
}

export interface EmailVerificationRecord {
    userId: string;
    expiresAt: Date;
    user: {
        status: UserStatusValue;
        emailVerifiedAt: Date | null;
    };
}

export interface PasswordResetUserRecord {
    id: string;
    email: string;
    username: string;
    status: UserStatusValue;
}

export interface PasswordResetRecord {
    userId: string;
    expiresAt: Date;
    user: {
        email: string;
        username: string;
        status: UserStatusValue;
    };
}

export interface AccountSecurityUserRecord {
    id: string;
    email: string;
    username: string;
    usernameNormalized: string;
    passwordHash: string;
    status: UserStatusValue;
}

export interface EmailChangeRecord {
    userId: string;
    newEmail: string;
    expiresAt: Date;
    user: {
        status: UserStatusValue;
    };
}

export interface AuthSecurity {
    hashPassword(password: string): Promise<string>;
    verifyPassword(passwordHash: string, password: string): Promise<boolean>;
    createAccessToken(context: AccessTokenContext): Promise<string>;
    verifyAccessToken(token: string): Promise<AccessTokenContext>;
    generateRefreshToken(): string;
    hashRefreshToken(token: string): string;
    calculateSessionExpiration(): Date;
    generateVerificationToken(): string;
    hashVerificationToken(token: string): string;
    generatePasswordResetToken(): string;
    hashPasswordResetToken(token: string): string;
    generateEmailChangeToken(): string;
    hashEmailChangeToken(token: string): string;
}

export interface VerificationEmailSender {
    send(email: string, token: string): Promise<void>;
}

export interface PasswordRecoveryEmailSender {
    sendResetLink(email: string, token: string): Promise<void>;
    sendPasswordChangedNotice(email: string): Promise<void>;
}

export interface AccountEmailSender {
    sendEmailChangeLink(email: string, token: string): Promise<void>;
}

export interface AuthLogger {
    error(
        error: unknown,
        context: Record<string, unknown>,
        message: string,
    ): void;
}

export class IdentityAlreadyExistsError extends Error {
    public constructor() {
        super("The email or username is already in use.");

        this.name = "IdentityAlreadyExistsError";

        Error.captureStackTrace(this, IdentityAlreadyExistsError);
    }
}
