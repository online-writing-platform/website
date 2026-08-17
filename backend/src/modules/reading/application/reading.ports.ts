import type {
    LibraryEntryView,
    ReadingListView,
    ReadingProgressView,
} from "../domain/reading.types.js";

export interface LibraryStore {
    addLibraryEntry(userId: string, storyId: string): Promise<void>;

    removeLibraryEntry(userId: string, storyId: string): Promise<void>;

    hasLibraryEntry(userId: string, storyId: string): Promise<boolean>;

    listLibrary(
        userId: string,
        cursor: string | undefined,
        limit: number,
    ): Promise<{
        entries: LibraryEntryView[];
        pagination: { hasMore: boolean; nextCursor: string | null };
    }>;

    upsertProgress(
        userId: string,
        storyId: string,
        chapterId: string | undefined,
        progress: number,
        anchor: string | undefined,
        qualified: boolean,
        readAt: Date,
    ): Promise<ReadingProgressView>;

    listProgress(
        userId: string,
        cursor: string | undefined,
        limit: number,
    ): Promise<{
        items: ReadingProgressView[];
        pagination: { hasMore: boolean; nextCursor: string | null };
    }>;

    deleteProgress(userId: string, storyId: string): Promise<void>;

    createReadingList(
        userId: string,
        name: string,
        description: string | undefined,
        isPublic: boolean,
    ): Promise<ReadingListView>;

    updateReadingList(
        userId: string,
        listId: string,
        input: {
            name?: string;
            description?: string | null;
            isPublic?: boolean;
        },
    ): Promise<ReadingListView | null>;

    deleteReadingList(userId: string, listId: string): Promise<boolean>;

    listOwnReadingLists(userId: string): Promise<ReadingListView[]>;

    listPublicReadingLists(
        userId: string,
        viewerId?: string,
    ): Promise<ReadingListView[]>;

    getReadingList(
        listId: string,
        viewerId: string | undefined,
    ): Promise<{
        list: ReadingListView & {
            owner: { username: string; displayName: string };
        };
        items: LibraryEntryView[];
    } | null>;

    addReadingListItem(
        userId: string,
        listId: string,
        storyId: string,
    ): Promise<boolean>;

    removeReadingListItem(
        userId: string,
        listId: string,
        storyId: string,
    ): Promise<boolean>;

    reorderReadingListItems(
        userId: string,
        listId: string,
        storyIds: string[],
        expectedOrderingVersion: number,
    ): Promise<{ orderingVersion: number } | null>;
}

export interface LibraryStoryAccess {
    findReadableStoryById(
        storyId: string,
        viewerId?: string,
    ): Promise<{ id: string } | null>;
    findReadableChapterById(
        chapterId: string,
        viewerId?: string,
    ): Promise<{
        id: string;
        storyId: string;
    } | null>;
}

export interface LibraryUserDirectory {
    findActiveByUsername(username: string): Promise<{ id: string } | null>;
}
