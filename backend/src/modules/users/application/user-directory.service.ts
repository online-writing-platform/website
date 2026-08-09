import { normalizeUsername } from "../../../utils/normalize.js";

import type { UserProfileStore } from "./user.ports.js";

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
