import type { StorySummary } from "../../content/index.js";

export interface FeedStore {
    listFollowingFeed(userId: string, cursor: string | undefined, limit: number): Promise<{
        stories: StorySummary[];
        pagination: { hasMore: boolean; nextCursor: string | null };
    }>;
}
