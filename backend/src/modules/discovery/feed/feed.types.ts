import type { StorySummary } from "../../stories/stories.types.js";

export interface FeedStore {
    listFollowingFeed(userId: string, cursor: string | undefined, limit: number): Promise<{
        stories: StorySummary[];
        pagination: { hasMore: boolean; nextCursor: string | null };
    }>;
}
