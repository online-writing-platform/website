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
