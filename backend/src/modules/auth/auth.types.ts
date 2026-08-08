export interface AuthContext {
    userId: string;
    sessionId: string;
}

export interface ClientInformation {
    userAgent?: string;
    ipAddress?: string;
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
