export type SearchType = "all" | "stories" | "users" | "tags";

export interface SearchStore {
    searchStories(
        query: string,
        limit: number,
        offset: number,
        viewerId?: string,
    ): Promise<
        Array<{
            id: string;
            slug: string;
            title: string;
            description: string;
            coverUrl: string | null;
            isMature: boolean;
            author: { username: string; displayName: string };
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
