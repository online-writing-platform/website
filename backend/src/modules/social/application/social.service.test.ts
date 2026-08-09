import assert from "node:assert/strict";
import test from "node:test";

import AppError from "../../../errors/app-error.js";
import type {
    SocialNotificationPublisher,
    SocialStore,
    SocialUserDirectory,
} from "./social.ports.js";
import { SocialPolicy, SocialService } from "./social.service.js";

function createStore(blocked = false): SocialStore {
    return {
        follow: () => Promise.resolve("CREATED"),
        unfollow: () => Promise.resolve(true),
        isFollowing: () => Promise.resolve(false),
        block: () => Promise.resolve(),
        unblock: () => Promise.resolve(),
        mute: () => Promise.resolve(),
        unmute: () => Promise.resolve(),
        isBlockedBetween: () => Promise.resolve(blocked),
        relationship: () =>
            Promise.resolve({
                following: false,
                blockedByMe: false,
                blockedMe: blocked,
                mutedByMe: false,
            }),
        listFollowers: () =>
            Promise.resolve({
                users: [],
                pagination: { hasMore: false, nextCursor: null },
            }),
        listFollowing: () =>
            Promise.resolve({
                users: [],
                pagination: { hasMore: false, nextCursor: null },
            }),
    };
}

const users: SocialUserDirectory = {
    findActiveByUsername: () =>
        Promise.resolve({
            id: "target",
            username: "target",
            displayName: "Target",
            avatarUrl: null,
        }),
};

void test("block policy rejects an interaction in either direction", async () => {
    const policy = new SocialPolicy(createStore(true));

    await assert.rejects(
        () => policy.assertMayInteract("actor", "target"),
        (error: unknown) => {
            if (!(error instanceof AppError)) return false;
            assert.equal(error.statusCode, 403);
            assert.equal(error.code, "INTERACTION_BLOCKED");
            return true;
        },
    );
});

void test("follow sends one logically deduplicated notification only after creation", async () => {
    const published: unknown[] = [];
    const notifications: SocialNotificationPublisher = {
        publish: (input) => {
            published.push(input);
            return Promise.resolve();
        },
    };
    const store = createStore(false);
    const service = new SocialService(store, users, notifications, new SocialPolicy(store));

    await service.follow("actor", "target");

    assert.equal(published.length, 1);
    assert.deepEqual(published[0], {
        recipientId: "target",
        actorId: "actor",
        type: "FOLLOW",
        dedupeKey: "follow:actor:target",
        data: { username: "target" },
    });
});

void test("self follow is rejected before persistence", async () => {
    const selfDirectory: SocialUserDirectory = {
        findActiveByUsername: () =>
            Promise.resolve({
                id: "actor",
                username: "actor",
                displayName: "Actor",
                avatarUrl: null,
            }),
    };
    const store = createStore(false);
    const notifications: SocialNotificationPublisher = {
        publish: () => Promise.resolve(),
    };
    const service = new SocialService(
        store,
        selfDirectory,
        notifications,
        new SocialPolicy(store),
    );

    await assert.rejects(
        () => service.follow("actor", "actor"),
        (error: unknown) => {
            if (!(error instanceof AppError)) return false;
            assert.equal(error.code, "CANNOT_FOLLOW_SELF");
            return true;
        },
    );
});
