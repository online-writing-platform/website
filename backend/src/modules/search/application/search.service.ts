import type { SearchStore, SearchType } from "./search.ports.js";

export class SearchService {
    public constructor(private readonly store: SearchStore) {}

    public async search(queryInput: string, type: SearchType, limit: number) {
        const query = queryInput.trim();

        if (type === "stories") {
            return { stories: await this.store.searchStories(query, limit) };
        }
        if (type === "users") {
            return { users: await this.store.searchUsers(query, limit) };
        }
        if (type === "tags") {
            return { tags: await this.store.searchTags(query, limit) };
        }

        const [stories, users, tags] = await Promise.all([
            this.store.searchStories(query, limit),
            this.store.searchUsers(query, limit),
            this.store.searchTags(query, limit),
        ]);
        return { stories, users, tags };
    }
}
