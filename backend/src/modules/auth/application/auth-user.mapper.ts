import type {
    AuthenticatedUser,
    AuthUserRecord,
} from "../domain/auth.types.js";

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
