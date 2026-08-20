import { type UserRoleValue } from "../auth/auth.types.js";

export interface UserCounts {
    followers: number;
    following: number;
    publishedStories: number;
}

export interface PrivateUserProfile {
    id: string;
    email: string;
    username: string;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    birthDate: string;
    emailVerified: boolean;
    role: UserRoleValue;
    counts: UserCounts;
    createdAt: Date;
    updatedAt: Date;
}

export interface PublicUserProfile {
    id: string;
    username: string;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    counts: UserCounts;
    createdAt: Date;
}

export interface UpdateProfileInput {
    displayName?: string;
    bio?: string | null;
    avatarUrl?: string | null;
}

export interface PrivateUserProfileRecord {
    id: string;
    email: string;
    username: string;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    birthDate: Date;
    emailVerifiedAt: Date | null;
    role: UserRoleValue;
    createdAt: Date;
    updatedAt: Date;
}

export interface PublicUserProfileRecord {
    id: string;
    username: string;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    createdAt: Date;
}

export interface UserProfileStore {
    findPrivateProfile(userId: string): Promise<PrivateUserProfileRecord | null>;
    findPublicProfile(usernameNormalized: string): Promise<PublicUserProfileRecord | null>;
    getCounts(userId: string): Promise<UserCounts>;
    updateProfile(
        userId: string,
        input: UpdateProfileInput,
    ): Promise<PrivateUserProfileRecord | null>;
    findDirectoryEntry(usernameNormalized: string): Promise<{
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
    } | null>;
    findDirectoryEntryById(userId: string): Promise<{
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
    } | null>;
}
