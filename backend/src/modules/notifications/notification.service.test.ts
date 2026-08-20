import assert from "node:assert/strict";
import test from "node:test";

import type {
    CreateNotificationInput,
    NotificationLogger,
    NotificationStore,
} from "./notification.types.js";
import { NotificationPublisher } from "./notification.service.js";

function store(
    shouldDeliver: boolean,
    created: CreateNotificationInput[],
): NotificationStore {
    return {
        shouldDeliver: () => Promise.resolve(shouldDeliver),
        create: (input) => {
            created.push(input);
            return Promise.resolve();
        },
        list: () =>
            Promise.resolve({
                items: [],
                hasMore: false,
                nextCursor: null,
            }),
        markRead: () => Promise.resolve(true),
        markAllRead: () => Promise.resolve(0),
    };
}

const logger: NotificationLogger = {
    error: () => undefined,
};

void test("publisher suppresses self notifications", async () => {
    const created: CreateNotificationInput[] = [];
    const publisher = new NotificationPublisher(store(true, created), logger);

    await publisher.publish({
        recipientId: "same",
        actorId: "same",
        type: "FOLLOW",
        data: {},
    });

    assert.equal(created.length, 0);
});

void test("publisher respects server-side delivery policy", async () => {
    const created: CreateNotificationInput[] = [];
    const publisher = new NotificationPublisher(store(false, created), logger);

    await publisher.publish({
        recipientId: "recipient",
        actorId: "actor",
        type: "COMMENT",
        data: { commentId: "comment" },
    });

    assert.equal(created.length, 0);
});
