import type { UserRoleValue } from "../../auth/index.js";
import type { UpdateProfileInput, UserCounts } from "../domain/user.types.js";

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
