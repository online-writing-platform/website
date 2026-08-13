import type { FeedStore } from "./feed.ports.js";

export class FeedService {
    public constructor(private readonly store: FeedStore) {}

    public list(userId: string, cursor: string | undefined, limit: number) {
        return this.store.listFollowingFeed(userId, cursor, limit);
    }
}
