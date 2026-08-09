import type {
    ChapterView,
    CreateChapterInput,
    CreateStoryInput,
    StoryDetail,
    StoryPage,
    StoryVisibilityValue,
    UpdateChapterInput,
    UpdateStoryInput,
} from "../domain/story.types.js";

export interface ReadableStoryReference {
    id: string;
    slug: string;
    authorId: string;
    title: string;
}

export interface ReadableChapterReference {
    id: string;
    storyId: string;
    storySlug: string;
    storyTitle: string;
    authorId: string;
    title: string;
}

export interface StoryOwnerState {
    id: string;
    authorId: string;
    status: "DRAFT" | "ONGOING" | "COMPLETED" | "HIATUS";
    visibility: StoryVisibilityValue;
    publishedAt: Date | null;
}

export type UpdateChapterResult =
    | { kind: "UPDATED"; chapter: ChapterView }
    | { kind: "CONFLICT"; current: ChapterView }
    | null;

export interface StoryStore {
    createStory(
        authorId: string,
        slug: string,
        input: CreateStoryInput,
        tagNames: Array<{ name: string; slug: string }>,
    ): Promise<StoryDetail>;

    findOwnedStory(
        authorId: string,
        storyId: string,
    ): Promise<StoryOwnerState | null>;

    updateStory(
        authorId: string,
        storyId: string,
        input: UpdateStoryInput,
        tagNames?: Array<{ name: string; slug: string }>,
    ): Promise<StoryDetail | null>;

    softDeleteStory(
        authorId: string,
        storyId: string,
        deletedAt: Date,
    ): Promise<boolean>;

    publishStory(
        authorId: string,
        storyId: string,
        publishedAt: Date,
    ): Promise<"PUBLISHED" | "NOT_FOUND" | "NO_PUBLISHED_CHAPTER">;

    unpublishStory(authorId: string, storyId: string): Promise<boolean>;

    getPublicStory(slug: string, viewerId?: string): Promise<StoryDetail | null>;

    findReadableStoryById(
        storyId: string,
        viewerId?: string,
    ): Promise<ReadableStoryReference | null>;

    findReadableChapterById(
        chapterId: string,
        viewerId?: string,
    ): Promise<ReadableChapterReference | null>;

    getOwnedStory(
        authorId: string,
        storyId: string,
    ): Promise<StoryDetail | null>;

    listPublicStories(
        cursor: string | undefined,
        limit: number,
        filters: {
            genre?: string;
            tag?: string;
            language?: string;
            author?: string;
        },
        viewerId?: string,
    ): Promise<StoryPage>;

    listOwnedStories(
        authorId: string,
        cursor: string | undefined,
        limit: number,
    ): Promise<StoryPage>;

    listGenres(): Promise<Array<{ slug: string; name: string }>>;
    genreExists(slug: string): Promise<boolean>;

    createChapter(
        authorId: string,
        storyId: string,
        input: CreateChapterInput,
        wordCount: number,
    ): Promise<ChapterView | null>;

    updateChapter(
        authorId: string,
        storyId: string,
        chapterId: string,
        input: UpdateChapterInput,
        wordCount: number | undefined,
    ): Promise<UpdateChapterResult>;

    softDeleteChapter(
        authorId: string,
        storyId: string,
        chapterId: string,
        deletedAt: Date,
    ): Promise<boolean>;

    publishChapter(
        authorId: string,
        storyId: string,
        chapterId: string,
        publishedAt: Date,
    ): Promise<ChapterView | "EMPTY" | null>;

    unpublishChapter(
        authorId: string,
        storyId: string,
        chapterId: string,
    ): Promise<ChapterView | null>;

    reorderChapters(
        authorId: string,
        storyId: string,
        chapterIds: string[],
    ): Promise<ChapterView[] | null>;

    getPublicChapter(
        storySlug: string,
        chapterId: string,
        viewerId?: string,
    ): Promise<ChapterView | null>;

    getOwnedChapter(
        authorId: string,
        storyId: string,
        chapterId: string,
    ): Promise<ChapterView | null>;
}
