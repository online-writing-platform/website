export type StoryStatus =
    | "DRAFT"
    | "SCHEDULED"
    | "ONGOING"
    | "COMPLETED"
    | "HIATUS";

export type StoryVisibility = "PRIVATE" | "UNLISTED" | "PUBLIC";

export type StoryRights =
    | "ALL_RIGHTS_RESERVED"
    | "PUBLIC_DOMAIN"
    | "CREATIVE_COMMONS";

export type ChapterStatus = "DRAFT" | "PUBLISHED";

export interface StoryAuthor {
    username: string;
    displayName: string;
    avatarUrl: string | null;
}

export interface StoryGenre {
    slug: string;
    name: string;
}

export interface StoryTag {
    slug: string;
    name: string;
}

export interface Chapter {
    id: string;

    title: string;

    position: number;

    content?: string;

    version: number;

    status: ChapterStatus;

    moderationState: "VISIBLE" | "HIDDEN" | "REMOVED";

    wordCount: number;

    publishedAt: string | null;

    createdAt: string;

    updatedAt: string;
}

export interface Story {
    id: string;

    slug: string;

    title: string;

    description: string;

    coverUrl: string | null;

    language: string;

    rights: StoryRights;

    status: StoryStatus;

    visibility: StoryVisibility;

    moderationState: "VISIBLE" | "HIDDEN" | "REMOVED";

    isMature: boolean;

    publishedAt: string | null;

    createdAt: string;

    updatedAt: string;

    author: StoryAuthor;

    genre: StoryGenre | null;

    tags: StoryTag[];

    chapters?: Chapter[];
}

export interface StoryPagination {
    hasMore: boolean;

    nextCursor: string | null;
}

export interface GetStoriesResponse {
    data: {
        stories: Story[];

        pagination: StoryPagination;
    };
}

export interface StoryResponse {
    data: {
        story: Story;
    };
}

export interface ChapterResponse {
    data: {
        chapter: Chapter;
    };
}

export interface DiscoveryStory extends Story {
    score?: number;

    reason?: string;

    libraryCount?: number;

    voteCount?: number;

    commentCount?: number;
}

export interface DiscoveryResponse {
    data: {
        recommended: DiscoveryStory[];

        recent: DiscoveryStory[];

        popular: DiscoveryStory[];
    };
}

export interface StorySectionProps {
    title: string;

    stories: Story[];
}
