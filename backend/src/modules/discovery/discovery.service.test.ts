import assert from "node:assert/strict";
import test from "node:test";

import type {
    DiscoveryCandidate,
    DiscoverySignals,
    DiscoveryStore,
} from "./discovery.types.js";
import { DiscoveryService } from "./discovery.service.js";

const now = new Date();
const candidate = (
    id: string,
    authorId: string,
    libraryCount: number,
): DiscoveryCandidate => ({
    id,
    slug: id,
    title: id,
    description: id,
    coverUrl: null,
    language: "fa",
    isMature: false,
    publishedAt: now,
    updatedAt: now,
    author: {
        id: authorId,
        username: authorId,
        displayName: authorId,
        avatarUrl: null,
    },
    genre: null,
    tags: [],
    libraryCount,
    voteCount: 0,
    commentCount: 0,
});

void test("discovery ranking is deterministic and gives followed authors a clear signal", async () => {
    const signals: DiscoverySignals = {
        followedAuthorIds: new Set(["followed"]),
        preferredGenres: new Map(),
        preferredTags: new Map(),
        blockedUserIds: new Set(),
        includeMature: false,
    };
    const candidates = [
        candidate("popular", "other", 100),
        candidate("followed-story", "followed", 1),
    ];
    const store: DiscoveryStore = {
        getSignals: () => Promise.resolve(signals),
        listCandidates: () => Promise.resolve(candidates),
    };

    const service = new DiscoveryService(store);
    const first = await service.home("viewer");
    const second = await service.home("viewer");

    assert.deepEqual(
        first.recommended.map((story) => story.id),
        second.recommended.map((story) => story.id),
    );
    assert.equal(first.recommended[0]?.id, "followed-story");
    assert.match(first.recommended[0]?.reason ?? "", /followed author/u);
});
