import AppError from "../../../errors/app-error.js";
import { ReadingListNameConflictError } from "../domain/reading.errors.js";

import type {
    LibraryStore,
    LibraryStoryAccess,
    LibraryUserDirectory,
} from "./reading.ports.js";

export class ReadingService {
    public constructor(
        private readonly store: LibraryStore,
        private readonly stories: LibraryStoryAccess,
        private readonly users: LibraryUserDirectory,
    ) {}

    private async requireStory(
        storyId: string,
        viewerId: string,
    ): Promise<void> {
        const story = await this.stories.findReadableStoryById(
            storyId,
            viewerId,
        );
        if (!story) {
            throw AppError.notFound("The story was not found.", "STORY_NOT_FOUND");
        }
    }

    public async add(userId: string, storyId: string): Promise<void> {
        await this.requireStory(storyId, userId);
        await this.store.addLibraryEntry(userId, storyId);
    }

    public remove(userId: string, storyId: string): Promise<void> {
        return this.store.removeLibraryEntry(userId, storyId);
    }

    public list(userId: string, cursor: string | undefined, limit: number) {
        return this.store.listLibrary(userId, cursor, limit);
    }

    public async updateProgress(
        userId: string,
        storyId: string,
        chapterId: string | undefined,
        progress: number,
        anchor?: string,
        qualified = false,
    ) {
        await this.requireStory(storyId, userId);

        if (chapterId) {
            const chapter = await this.stories.findReadableChapterById(
                chapterId,
                userId,
            );
            if (!chapter || chapter.storyId !== storyId) {
                throw AppError.badRequest(
                    "The chapter does not belong to the requested story.",
                    "INVALID_READING_CHAPTER",
                );
            }
        }

        return this.store.upsertProgress(
            userId,
            storyId,
            chapterId,
            progress,
            anchor,
            qualified,
            new Date(),
        );
    }

    public listProgress(userId: string, cursor: string | undefined, limit: number) {
        return this.store.listProgress(userId, cursor, limit);
    }

    public deleteProgress(userId: string, storyId: string) {
        return this.store.deleteProgress(userId, storyId);
    }

    public async createList(
        userId: string,
        name: string,
        description: string | undefined,
        isPublic: boolean,
    ) {
        try {
            return await this.store.createReadingList(
                userId,
                name.trim(),
                description?.trim() || undefined,
                isPublic,
            );
        } catch (error) {
            if (error instanceof ReadingListNameConflictError) {
                throw AppError.conflict(
                    "A reading list with this name already exists.",
                    "READING_LIST_NAME_CONFLICT",
                );
            }
            throw error;
        }
    }

    public async updateList(
        userId: string,
        listId: string,
        input: { name?: string; description?: string | null; isPublic?: boolean },
    ) {
        let list;
        try {
            list = await this.store.updateReadingList(userId, listId, {
                ...(input.name !== undefined ? { name: input.name.trim() } : {}),
                ...(input.description !== undefined
                    ? { description: input.description === null ? null : input.description.trim() }
                    : {}),
                ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
            });
        } catch (error) {
            if (error instanceof ReadingListNameConflictError) {
                throw AppError.conflict(
                    "A reading list with this name already exists.",
                    "READING_LIST_NAME_CONFLICT",
                );
            }
            throw error;
        }
        if (!list) {
            throw AppError.notFound("The reading list was not found.", "READING_LIST_NOT_FOUND");
        }
        return list;
    }

    public async deleteList(userId: string, listId: string): Promise<void> {
        const deleted = await this.store.deleteReadingList(userId, listId);
        if (!deleted) {
            throw AppError.notFound("The reading list was not found.", "READING_LIST_NOT_FOUND");
        }
    }

    public listOwnLists(userId: string) {
        return this.store.listOwnReadingLists(userId);
    }

    public async listPublicLists(
        username: string,
        viewerId?: string,
    ) {
        const user = await this.users.findActiveByUsername(username);
        if (!user) {
            throw AppError.notFound("The requested user was not found.", "USER_NOT_FOUND");
        }
        return this.store.listPublicReadingLists(user.id, viewerId);
    }

    public async getList(listId: string, viewerId: string | undefined) {
        const result = await this.store.getReadingList(listId, viewerId);
        if (!result) {
            throw AppError.notFound("The reading list was not found.", "READING_LIST_NOT_FOUND");
        }
        return result;
    }

    public async addListItem(userId: string, listId: string, storyId: string): Promise<void> {
        await this.requireStory(storyId, userId);
        const ok = await this.store.addReadingListItem(userId, listId, storyId);
        if (!ok) {
            throw AppError.notFound("The reading list was not found.", "READING_LIST_NOT_FOUND");
        }
    }

    public async removeListItem(userId: string, listId: string, storyId: string): Promise<void> {
        const ok = await this.store.removeReadingListItem(userId, listId, storyId);
        if (!ok) {
            throw AppError.notFound("The reading list was not found.", "READING_LIST_NOT_FOUND");
        }
    }

    public async reorderListItems(
        userId: string,
        listId: string,
        storyIds: string[],
        expectedOrderingVersion: number,
    ) {
        if (new Set(storyIds).size !== storyIds.length) {
            throw AppError.validation(
                "Reading-list order contains duplicate story IDs.",
                "INVALID_READING_LIST_ORDER",
            );
        }
        const result = await this.store.reorderReadingListItems(
            userId,
            listId,
            storyIds,
            expectedOrderingVersion,
        );
        if (!result) {
            throw AppError.conflict(
                "The reading list changed before this reorder was applied.",
                "ORDERING_CONFLICT",
            );
        }
        return result;
    }
}
