import AppError from "../../errors/app-error.js";
import { normalizeUsername } from "../../utils/normalize.js";
import { type PrivateUserProfile, type PublicUserProfile, type UpdateProfileInput, type UserProfileStore } from "./user.types.js";
import { UserRepository } from "./users.repo.js";

export class UserProfileService {
    public constructor(private readonly store: UserProfileStore) {}

    public async getMe(userId: string): Promise<PrivateUserProfile> {
        const [user, counts] = await Promise.all([
            this.store.findPrivateProfile(userId),
            this.store.getCounts(userId),
        ]);

        if (!user) {
            throw AppError.notFound(
                "The user account was not found.",
                "USER_NOT_FOUND",
            );
        }

        return {
            ...user,
            birthDate: user.birthDate.toISOString().slice(0, 10),
            emailVerified: user.emailVerifiedAt !== null,
            counts,
        };
    }

    public async getPublic(username: string): Promise<PublicUserProfile> {
        const user = await this.store.findPublicProfile(normalizeUsername(username));

        if (!user) {
            throw AppError.notFound(
                "The requested user was not found.",
                "USER_NOT_FOUND",
            );
        }

        return {
            ...user,
            counts: await this.store.getCounts(user.id),
        };
    }

    public async updateMe(
        userId: string,
        input: UpdateProfileInput,
    ): Promise<PrivateUserProfile> {
        const updateData: UpdateProfileInput = {};

        if (input.displayName !== undefined) {
            updateData.displayName = input.displayName.trim();
        }

        if (input.bio !== undefined) {
            updateData.bio = input.bio === null ? null : input.bio.trim();
        }

        if (input.avatarUrl !== undefined) {
            updateData.avatarUrl =
                input.avatarUrl === null ? null : input.avatarUrl.trim();
        }

        const user = await this.store.updateProfile(userId, updateData);

        if (!user) {
            throw AppError.notFound(
                "The user account was not found.",
                "USER_NOT_FOUND",
            );
        }

        return {
            ...user,
            birthDate: user.birthDate.toISOString().slice(0, 10),
            emailVerified: user.emailVerifiedAt !== null,
            counts: await this.store.getCounts(userId),
        };
    }
}

export interface UserDirectoryEntry {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
}

export class UserDirectoryService {
    public constructor(private readonly store: UserProfileStore) {}

    public findActiveByUsername(username: string): Promise<UserDirectoryEntry | null> {
        return this.store.findDirectoryEntry(normalizeUsername(username));
    }

    public findActiveById(userId: string): Promise<UserDirectoryEntry | null> {
        return this.store.findDirectoryEntryById(userId);
    }
}

const store = new UserRepository();

export const userServices = {
    profile: new UserProfileService(store),
    directory: new UserDirectoryService(store),
};
