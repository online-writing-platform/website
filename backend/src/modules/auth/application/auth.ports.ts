import type {
    AuthContext,
    AuthUserRecord,
    AuthUserWithPassword,
    UserStatusValue,
} from "../domain/auth.types.js";

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

export interface AuthStore {
    findIdentityConflict(
        email: string,
        usernameNormalized: string,
    ): Promise<IdentityConflictRecord | null>;

    createUserWithSession(input: CreateUserWithSessionInput): Promise<{
        user: AuthUserRecord;
        sessionId: string;
    }>;

    findUserForLogin(
        email: string,
        usernameNormalized: string,
    ): Promise<AuthUserWithPassword | null>;

    createSession(input: CreateSessionInput): Promise<{
        id: string;
    }>;

    findSessionByRefreshTokenHash(
        refreshTokenHash: string,
    ): Promise<SessionWithUserRecord | null>;

    revokeSessionById(sessionId: string, revokedAt: Date): Promise<void>;

    rotateSession(
        sessionId: string,
        currentRefreshTokenHash: string,
        nextRefreshTokenHash: string,
        usedAt: Date,
    ): Promise<boolean>;

    revokeSessionByRefreshTokenHash(
        refreshTokenHash: string,
        revokedAt: Date,
    ): Promise<void>;

    isSessionActive(
        userId: string,
        sessionId: string,
        now: Date,
    ): Promise<boolean>;

    findVerificationState(userId: string): Promise<{
        sentAt: Date;
    } | null>;

    upsertVerificationToken(
        userId: string,
        tokenHash: string,
        expiresAt: Date,
        sentAt: Date,
    ): Promise<void>;

    findVerificationUser(
        userId: string,
    ): Promise<VerificationUserRecord | null>;

    deleteVerificationToken(userId: string, tokenHash?: string): Promise<void>;

    findVerificationByTokenHash(
        tokenHash: string,
    ): Promise<EmailVerificationRecord | null>;

    verifyEmailAndConsumeTokens(
        userId: string,
        verifiedAt: Date,
    ): Promise<void>;
}

export interface AuthSecurity {
    hashPassword(password: string): Promise<string>;

    verifyPassword(passwordHash: string, password: string): Promise<boolean>;

    createAccessToken(context: AuthContext): Promise<string>;

    verifyAccessToken(token: string): Promise<AuthContext>;

    generateRefreshToken(): string;

    hashRefreshToken(token: string): string;

    calculateSessionExpiration(): Date;

    generateVerificationToken(): string;

    hashVerificationToken(token: string): string;
}

export interface VerificationEmailSender {
    send(email: string, token: string): Promise<void>;
}

export interface AuthLogger {
    error(
        error: unknown,
        context: Record<string, unknown>,
        message: string,
    ): void;
}
