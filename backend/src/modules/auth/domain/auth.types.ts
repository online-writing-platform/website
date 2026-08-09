export type UserStatusValue = "ACTIVE" | "SUSPENDED" | "DELETED";

export interface AuthContext {
    userId: string;
    sessionId: string;
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

    createdAt: Date;
    updatedAt: Date;
}

export interface AuthenticationResult {
    user: AuthenticatedUser;

    accessToken: string;
    refreshToken: string;

    sessionExpiresAt: Date;
}
