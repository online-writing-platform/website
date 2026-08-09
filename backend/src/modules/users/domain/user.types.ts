import type { UserRoleValue } from "../../auth/index.js";

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
