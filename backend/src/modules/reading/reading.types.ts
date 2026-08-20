export interface LibraryStorySummary {
    id: string;
    slug: string;
    title: string;
    coverUrl: string | null;
    status: "DRAFT" | "SCHEDULED" | "ONGOING" | "COMPLETED" | "HIATUS" | "ARCHIVED";
    isMature: boolean;
    author: {
        username: string;
        displayName: string;
    };
}

export interface LibraryEntryView {
    addedAt: Date;
    story: LibraryStorySummary;
}

export interface ReadingProgressView {
    progress: number;
    anchor?: string | null;
    completedAt?: Date | null;
    lastReadAt: Date;
    chapter: { id: string; title: string } | null;
    story: LibraryStorySummary;
}

export interface ReadingListView {
    id: string;
    name: string;
    description: string | null;
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
    itemCount: number;
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
