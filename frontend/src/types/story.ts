export type StoryStatus = "DRAFT" | "ONGOING" | "COMPLETED" | "HIATUS";

export interface StoryAuthor {
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface StoryListItem {
  id: number;
  image: string;
  title: string;
  category: string;
  link: string;
  // id: number;
  //   image: string;
  //   slug: string;
  //   title: string;
  //   description: string;
  //   coverUrl: string | null;
  //   language: string;
  //   status: StoryStatus;
  //   isMature: boolean;
  //   publishedAt: string;
  //   author: StoryAuthor;
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
export interface StorySectionProps {
  title: string;
  stories: StoryListItem[];
}
