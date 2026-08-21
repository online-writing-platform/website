export type SearchType = "all" | "stories" | "users" | "tags";

export type StorySearchSort = "relevance" | "mostRead" | "mostVoted" | "newest";

export interface StorySearchFilters {
  genre?: string;
  tag?: string;
  language?: string;
  sort: StorySearchSort;
}

export interface SearchStore {
  searchStories(
    query: string | undefined,
    limit: number,
    offset: number,
    filters: StorySearchFilters,
    viewerId?: string,
  ): Promise<
    Array<{
      id: string;
      slug: string;
      title: string;
      description: string;
      coverUrl: string | null;
      language: string;
      status: "ONGOING" | "COMPLETED" | "HIATUS";
      isMature: boolean;
      publishedAt: Date;
      author: {
        username: string;
        displayName: string;
        avatarUrl: string | null;
      };
      genre: { slug: string; name: string } | null;
      libraryCount: number;
      voteCount: number;
      commentCount: number;
      qualifiedViews: number;
      chapterCount: number;
    }>
  >;

  searchUsers(
    query: string,
    limit: number,
    offset: number,
    viewerId?: string,
  ): Promise<
    Array<{
      id: string;
      username: string;
      displayName: string;
      bio: string | null;
      avatarUrl: string | null;
    }>
  >;

  searchTags(
    query: string,
    limit: number,
    offset: number,
    viewerId?: string,
  ): Promise<
    Array<{
      slug: string;
      name: string;
      storyCount: number;
    }>
  >;
}
