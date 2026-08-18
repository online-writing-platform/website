import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../../db/index.js";

import { handleOutbox } from "./job-handlers.js";

type UnknownRecord = Record<string, unknown>;

void test("STORY_PUBLISHED outbox creates a STORY_PUBLISHED notification", async (t) => {
    const authorId = "11111111-1111-4111-8111-111111111111";

    const followerId = "22222222-2222-4222-8222-222222222222";

    const storyId = "33333333-3333-4333-8333-333333333333";

    const notificationWrites: UnknownRecord[] = [];

    const story = {
        id: storyId,

        title: "داستان آزمایشی",

        authorId,

        author: {
            followers: [
                {
                    followerId,
                },
            ],
        },
    };

    const storyTarget = prisma.story as unknown as {
        findUnique?: (args: unknown) => Promise<unknown>;
    };

    t.mock.property(storyTarget, "findUnique", () => Promise.resolve(story));

    const jobTarget = prisma.job as unknown as {
        upsert?: (args: UnknownRecord) => Promise<unknown>;
    };

    t.mock.property(jobTarget, "upsert", () =>
        Promise.resolve({
            id: "job-1",
        }),
    );

    const notificationTarget = prisma.notification as unknown as {
        upsert?: (args: UnknownRecord) => Promise<unknown>;
    };

    t.mock.property(notificationTarget, "upsert", (args: UnknownRecord) => {
        notificationWrites.push(args);

        return Promise.resolve({
            id: "notification-1",
        });
    });

    const prismaTarget = prisma as unknown as {
        $transaction?: (input: unknown) => Promise<unknown>;
    };

    t.mock.property(prismaTarget, "$transaction", (input: unknown) => {
        if (Array.isArray(input)) {
            return Promise.all(input as Array<Promise<unknown>>);
        }

        return Promise.reject(new Error("Unexpected transaction input."));
    });

    const message = {
        id: "outbox-story-published-1",

        eventType: "STORY_PUBLISHED",

        aggregateType: "STORY",

        aggregateId: storyId,

        payload: {
            storyId,

            publishedAt: "2026-08-18T08:00:00.000Z",
        },

        attempts: 1,

        maxAttempts: 5,
    } as Parameters<typeof handleOutbox>[0];

    await handleOutbox(message);

    assert.equal(
        notificationWrites.length,
        1,
        "STORY_PUBLISHED should create one notification for the follower.",
    );

    const notificationWrite = notificationWrites[0];

    const create = notificationWrite?.create;

    assert.ok(
        create && typeof create === "object" && !Array.isArray(create),
        "Notification upsert must contain create data.",
    );

    const createRecord = create as UnknownRecord;

    assert.equal(
        createRecord.type,
        "STORY_PUBLISHED",
        "A STORY_PUBLISHED outbox event must create a STORY_PUBLISHED notification, not CHAPTER_PUBLISHED.",
    );

    const data = createRecord.data;

    assert.ok(data && typeof data === "object" && !Array.isArray(data));

    const dataRecord = data as UnknownRecord;

    assert.equal(dataRecord.storyId, storyId);

    assert.equal(dataRecord.storyTitle, story.title);

    assert.equal(
        Object.prototype.hasOwnProperty.call(dataRecord, "chapterId"),
        false,
        "Story publication notification must not pretend to reference a chapter.",
    );
});
