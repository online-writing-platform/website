export type StoryStatus = "DRAFT" | "ONGOING" | "COMPLETED" | "HIATUS";

export interface StoryAuthor {
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface StoryListItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverUrl: string | null;
  language: string;
  status: StoryStatus;
  isMature: boolean;
  publishedAt: string;
  author: StoryAuthor;
}

export interface StoryPagination {
  hasMore: boolean;
  nextCursor: string | null;
}

export interface GetStoriesResponse {
  data: {
    stories: StoryListItem[];
    pagination: StoryPagination;
  };
}
