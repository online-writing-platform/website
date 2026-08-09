export type StoryStatusValue = "DRAFT" | "ONGOING" | "COMPLETED" | "HIATUS";
export type StoryVisibilityValue = "PRIVATE" | "UNLISTED" | "PUBLIC";
export type ChapterStatusValue = "DRAFT" | "PUBLISHED";
export type ModerationStateValue = "VISIBLE" | "HIDDEN" | "REMOVED";

export interface StoryAuthorView {
    username: string;
    displayName: string;
    avatarUrl: string | null;
}

export interface GenreView {
    slug: string;
    name: string;
}

export interface TagView {
    slug: string;
    name: string;
}

export interface ChapterView {
    id: string;
    title: string;
    position: number;
    content?: string;
    status: ChapterStatusValue;
    moderationState: ModerationStateValue;
    wordCount: number;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface StorySummary {
    id: string;
    slug: string;
    title: string;
    description: string;
    coverUrl: string | null;
    language: string;
    status: StoryStatusValue;
    visibility: StoryVisibilityValue;
    moderationState: ModerationStateValue;
    isMature: boolean;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    author: StoryAuthorView;
    genre: GenreView | null;
    tags: TagView[];
}

export interface StoryDetail extends StorySummary {
    chapters: ChapterView[];
}

export interface CreateStoryInput {
    title: string;
    description: string;
    coverUrl?: string | null;
    language?: string;
    isMature?: boolean;
    genreSlug?: string | null;
    tags?: string[];
}

export interface UpdateStoryInput {
    title?: string;
    description?: string;
    coverUrl?: string | null;
    language?: string;
    isMature?: boolean;
    genreSlug?: string | null;
    tags?: string[];
    status?: Exclude<StoryStatusValue, "DRAFT">;
    visibility?: Exclude<StoryVisibilityValue, "PUBLIC">;
}

export interface CreateChapterInput {
    title: string;
    content: string;
}

export interface UpdateChapterInput {
    title?: string;
    content?: string;
}

export interface StoryPage {
    stories: StorySummary[];
    pagination: {
        hasMore: boolean;
        nextCursor: string | null;
    };
}
