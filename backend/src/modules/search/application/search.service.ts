import type { SearchStore, SearchType } from "./search.ports.js";

export class SearchService {
    public constructor(private readonly store: SearchStore) {}

    public async search(
        queryInput: string,
        type: SearchType,
        limit: number,
        page: number,
        viewerId?: string,
    ) {
        const query = queryInput.trim();
        const offset = (page - 1) * limit;

        if (type === "stories") {
            return {
                stories: await this.store.searchStories(
                    query,
                    limit,
                    offset,
                    viewerId,
                ),
                pagination: { page, limit },
            };
        }
        if (type === "users") {
            return {
                users: await this.store.searchUsers(
                    query,
                    limit,
                    offset,
                    viewerId,
                ),
                pagination: { page, limit },
            };
        }
        if (type === "tags") {
            return {
                tags: await this.store.searchTags(
                    query,
                    limit,
                    offset,
                    viewerId,
                ),
                pagination: { page, limit },
            };
        }

        const [stories, users, tags] = await Promise.all([
            this.store.searchStories(query, limit, offset, viewerId),
            this.store.searchUsers(query, limit, offset, viewerId),
            this.store.searchTags(query, limit, offset, viewerId),
        ]);

        return {
            stories,
            users,
            tags,
            pagination: { page, limit },
        };
    }
}
