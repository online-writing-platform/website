import { FeedRepository } from "./feed.repo.js";
import { type FeedStore } from "./feed.types.js";

export class FeedService {
    public constructor(private readonly store: FeedStore) {}

    public list(userId: string, cursor: string | undefined, limit: number) {
        return this.store.listFollowingFeed(userId, cursor, limit);
    }
}

const store = new FeedRepository();

export const feedServices = { service: new FeedService(store) };
