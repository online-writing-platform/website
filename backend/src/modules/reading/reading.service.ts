import AppError from "../../errors/app-error.js";
import { storiesServices } from "../stories/stories.service.js";
import { userServices } from "../users/user.service.js";
import { ReadingListNameConflictError } from "./reading.errors.js";
import { LibraryRepository } from "./library.repo.js";
import { ProgressRepository } from "./progress.repo.js";
import { ReadingListsRepository } from "./reading-lists.repo.js";
import { type LibraryStoryAccess, type LibraryUserDirectory } from "./reading.types.js";

export class ReadingService {
    public constructor(
        private readonly library: LibraryRepository,
        private readonly progress: ProgressRepository,
        private readonly lists: ReadingListsRepository,
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
        await this.library.addLibraryEntry(userId, storyId);
    }

    public remove(userId: string, storyId: string): Promise<void> {
        return this.library.removeLibraryEntry(userId, storyId);
    }

    public contains(userId: string, storyId: string): Promise<boolean> {
        return this.library.hasLibraryEntry(userId, storyId);
    }

    public list(userId: string, cursor: string | undefined, limit: number) {
        return this.library.listLibrary(userId, cursor, limit);
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

        return this.progress.upsertProgress(
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
        return this.progress.listProgress(userId, cursor, limit);
    }

    public deleteProgress(userId: string, storyId: string) {
        return this.progress.deleteProgress(userId, storyId);
    }

    public async createList(
        userId: string,
        name: string,
        description: string | undefined,
        isPublic: boolean,
    ) {
        try {
            return await this.lists.createReadingList(
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
            list = await this.lists.updateReadingList(userId, listId, {
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
        const deleted = await this.lists.deleteReadingList(userId, listId);
        if (!deleted) {
            throw AppError.notFound("The reading list was not found.", "READING_LIST_NOT_FOUND");
        }
    }

    public listOwnLists(userId: string) {
        return this.lists.listOwnReadingLists(userId);
    }

    public async listPublicLists(
        username: string,
        viewerId?: string,
    ) {
        const user = await this.users.findActiveByUsername(username);
        if (!user) {
            throw AppError.notFound("The requested user was not found.", "USER_NOT_FOUND");
        }
        return this.lists.listPublicReadingLists(user.id, viewerId);
    }

    public async getList(listId: string, viewerId: string | undefined) {
        const result = await this.lists.getReadingList(listId, viewerId);
        if (!result) {
            throw AppError.notFound("The reading list was not found.", "READING_LIST_NOT_FOUND");
        }
        return result;
    }

    public async addListItem(userId: string, listId: string, storyId: string): Promise<void> {
        await this.requireStory(storyId, userId);
        const ok = await this.lists.addReadingListItem(userId, listId, storyId);
        if (!ok) {
            throw AppError.notFound("The reading list was not found.", "READING_LIST_NOT_FOUND");
        }
    }

    public async removeListItem(userId: string, listId: string, storyId: string): Promise<void> {
        const ok = await this.lists.removeReadingListItem(userId, listId, storyId);
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
        const result = await this.lists.reorderReadingListItems(
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

const libraryRepository = new LibraryRepository();
const progressRepository = new ProgressRepository();
const readingListsRepository = new ReadingListsRepository();

export const readingServices = {
    service: new ReadingService(
        libraryRepository,
        progressRepository,
        readingListsRepository,
        storiesServices.access,
        userServices.directory,
    ),
};
