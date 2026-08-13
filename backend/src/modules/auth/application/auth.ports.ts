import type {
    AccessTokenContext,
    AuthContext,
    AuthUserRecord,
    AuthUserWithPassword,
    SessionView,
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

    createSession(input: CreateSessionInput): Promise<{ id: string }>;

    findSessionByRefreshTokenHash(
        refreshTokenHash: string,
    ): Promise<SessionWithUserRecord | null>;

    findConsumedSessionByRefreshTokenHash(
        refreshTokenHash: string,
    ): Promise<ConsumedRefreshSessionRecord | null>;

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

    getAuthenticatedPrincipal(
        userId: string,
        sessionId: string,
        now: Date,
    ): Promise<AuthContext | null>;

    findVerificationState(userId: string): Promise<{ sentAt: Date } | null>;

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

    findPasswordResetUser(
        email: string,
        usernameNormalized: string,
    ): Promise<PasswordResetUserRecord | null>;

    findPasswordResetState(userId: string): Promise<{ sentAt: Date } | null>;

    upsertPasswordResetToken(
        userId: string,
        tokenHash: string,
        expiresAt: Date,
        sentAt: Date,
    ): Promise<void>;

    deletePasswordResetToken(userId: string, tokenHash?: string): Promise<void>;

    findPasswordResetByTokenHash(
        tokenHash: string,
    ): Promise<PasswordResetRecord | null>;

    resetPasswordAndRevokeSessions(
        userId: string,
        tokenHash: string,
        passwordHash: string,
        resetAt: Date,
    ): Promise<boolean>;

    findAccountSecurityUser(
        userId: string,
    ): Promise<AccountSecurityUserRecord | null>;

    findUserIdByEmail(email: string): Promise<string | null>;

    changePasswordAndRevokeOtherSessions(
        userId: string,
        currentSessionId: string,
        passwordHash: string,
        changedAt: Date,
    ): Promise<boolean>;

    updateUsername(
        userId: string,
        username: string,
        usernameNormalized: string,
    ): Promise<boolean>;

    findEmailChangeState(userId: string): Promise<{
        newEmail: string;
        sentAt: Date;
    } | null>;

    upsertEmailChangeToken(
        userId: string,
        newEmail: string,
        tokenHash: string,
        expiresAt: Date,
        sentAt: Date,
    ): Promise<void>;

    deleteEmailChangeToken(userId: string, tokenHash?: string): Promise<void>;

    findEmailChangeByTokenHash(
        tokenHash: string,
    ): Promise<EmailChangeRecord | null>;

    applyEmailChangeAndRevokeSessions(
        userId: string,
        tokenHash: string,
        newEmail: string,
        changedAt: Date,
    ): Promise<boolean>;

    listActiveSessions(
        userId: string,
        now: Date,
    ): Promise<Array<Omit<SessionView, "current">>>;

    revokeOwnedSession(
        userId: string,
        sessionId: string,
        revokedAt: Date,
    ): Promise<boolean>;

    revokeOtherSessions(
        userId: string,
        currentSessionId: string,
        revokedAt: Date,
    ): Promise<number>;

    deleteAccount(
        userId: string,
        tombstoneEmail: string,
        tombstoneUsername: string,
        passwordHash: string,
        deletedAt: Date,
    ): Promise<boolean>;
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
