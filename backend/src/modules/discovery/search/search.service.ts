import type { SearchStore, SearchType } from "./search.ports.js";

import { normalizeSearchText } from "./search-normalize.js";

function paginateItems<T>(
    items: T[],
    limit: number,
): {
    items: T[];
    hasMore: boolean;
} {
    return {
        items: items.slice(0, limit),

        hasMore: items.length > limit,
    };
}

export class SearchService {
    public constructor(private readonly store: SearchStore) {}

    public async search(
        queryInput: string,
        type: SearchType,
        limit: number,
        page: number,
        viewerId?: string,
    ) {
        const query = normalizeSearchText(queryInput);

        const offset = (page - 1) * limit;

        const fetchLimit = limit + 1;

        if (type === "stories") {
            const rawStories = await this.store.searchStories(
                query,
                fetchLimit,
                offset,
                viewerId,
            );

            const { items: stories, hasMore } = paginateItems(
                rawStories,
                limit,
            );

            return {
                stories,

                pagination: {
                    page,
                    limit,
                    hasMore,
                },
            };
        }

        if (type === "users") {
            const rawUsers = await this.store.searchUsers(
                query,
                fetchLimit,
                offset,
                viewerId,
            );

            const { items: users, hasMore } = paginateItems(rawUsers, limit);

            return {
                users,

                pagination: {
                    page,
                    limit,
                    hasMore,
                },
            };
        }

        if (type === "tags") {
            const rawTags = await this.store.searchTags(
                query,
                fetchLimit,
                offset,
                viewerId,
            );

            const { items: tags, hasMore } = paginateItems(rawTags, limit);

            return {
                tags,

                pagination: {
                    page,
                    limit,
                    hasMore,
                },
            };
        }

        const [rawStories, rawUsers, rawTags] = await Promise.all([
            this.store.searchStories(query, fetchLimit, offset, viewerId),

            this.store.searchUsers(query, fetchLimit, offset, viewerId),

            this.store.searchTags(query, fetchLimit, offset, viewerId),
        ]);

        const storyPage = paginateItems(rawStories, limit);

        const userPage = paginateItems(rawUsers, limit);

        const tagPage = paginateItems(rawTags, limit);

        return {
            stories: storyPage.items,

            users: userPage.items,

            tags: tagPage.items,

            pagination: {
                page,

                limit,

                hasMore:
                    storyPage.hasMore || userPage.hasMore || tagPage.hasMore,
            },
        };
    }
}
