import assert from "node:assert/strict";
import test from "node:test";

import type { SearchStore } from "./search.types.js";

import { SearchService } from "./search.service.js";

interface StoriesSearchResultForTest {
    stories: unknown[];

    pagination: {
        page: number;
        limit: number;

        hasMore?: boolean;
    };
}

void test("stories search reports hasMore when more results exist than the requested page limit", async () => {
    const limit = 12;

    const page = 1;

    const stories = Array.from(
        {
            length: limit + 1,
        },
        (_, index) => ({
            id: `story-${index + 1}`,

            slug: `story-${index + 1}`,

            title: `Story ${index + 1}`,

            description: `Description ${index + 1}`,

            coverUrl: null,

            isMature: false,

            author: {
                username: `writer-${index + 1}`,

                displayName: `Writer ${index + 1}`,
            },
        }),
    );

    const store = {
        searchStories: () => Promise.resolve(stories),

        searchUsers: () => Promise.resolve([]),

        searchTags: () => Promise.resolve([]),
    } as unknown as SearchStore;

    const service = new SearchService(store);

    const rawResult = await service.search("test", "stories", limit, page);

    const result = rawResult as unknown as StoriesSearchResultForTest;

    assert.equal(
        result.pagination.hasMore,
        true,
        "Search pagination must report hasMore=true when another page exists.",
    );

    assert.equal(
        result.stories.length,
        limit,
        "Search must return at most the requested limit.",
    );

    assert.equal(result.pagination.page, page);

    assert.equal(result.pagination.limit, limit);
});
