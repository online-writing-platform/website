import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../../db/index.js";

import { PrismaContentStore } from "./prisma-content.store.js";

type UnknownRecord = Record<string, unknown>;

void test("manual chapter publish emits CHAPTER_PUBLISHED outbox event", async (t) => {
    const authorId = "11111111-1111-4111-8111-111111111111";

    const storyId = "22222222-2222-4222-8222-222222222222";

    const chapterId = "33333333-3333-4333-8333-333333333333";

    const publishedAt = new Date("2026-08-18T08:00:00.000Z");

    const outboxEvents: UnknownRecord[] = [];

    const chapterRow = {
        id: chapterId,

        storyId,

        title: "فصل اول",

        content: "متن فصل آزمایشی",

        contentHash: "test-content-hash",

        position: 1,

        status: "PUBLISHED",

        moderationState: "VISIBLE",

        wordCount: 3,

        version: 1,

        publishedAt,

        scheduledAt: null,

        deletedAt: null,

        createdAt: new Date("2026-08-18T07:00:00.000Z"),

        updatedAt: publishedAt,
    };

    const transaction = {
        chapter: {
            findFirst: () =>
                Promise.resolve({
                    wordCount: chapterRow.wordCount,
                }),

            update: () => Promise.resolve(chapterRow),
        },

        outboxMessage: {
            create: ({ data }: { data: UnknownRecord }) => {
                outboxEvents.push(data);

                return Promise.resolve({
                    id: "outbox-1",

                    ...data,
                });
            },
        },
    };

    const chapterTarget = prisma.chapter as unknown as {
        findFirst?: (args: unknown) => Promise<unknown>;

        update?: (args: unknown) => Promise<unknown>;
    };

    t.mock.property(chapterTarget, "findFirst", () =>
        Promise.resolve({
            wordCount: chapterRow.wordCount,
        }),
    );

    t.mock.property(chapterTarget, "update", () => Promise.resolve(chapterRow));

    const outboxTarget = prisma.outboxMessage as unknown as {
        create?: (args: { data: UnknownRecord }) => Promise<unknown>;
    };

    t.mock.property(
        outboxTarget,
        "create",
        ({ data }: { data: UnknownRecord }) => {
            outboxEvents.push(data);

            return Promise.resolve({
                id: "outbox-1",

                ...data,
            });
        },
    );

    const prismaTarget = prisma as unknown as {
        $transaction?: (
            callback: (tx: typeof transaction) => Promise<unknown>,
        ) => Promise<unknown>;
    };

    t.mock.property(
        prismaTarget,
        "$transaction",
        (callback: (tx: typeof transaction) => Promise<unknown>) =>
            callback(transaction),
    );

    const store = new PrismaContentStore();

    const result = await store.publishChapter(
        authorId,
        storyId,
        chapterId,
        publishedAt,
    );

    assert.notEqual(
        result,
        null,
        "Manual chapter publication itself should succeed.",
    );

    assert.notEqual(
        result,
        "EMPTY",
        "The non-empty chapter should be publishable.",
    );

    assert.equal(
        outboxEvents.length,
        1,
        "Manual chapter publish must emit exactly one CHAPTER_PUBLISHED outbox event.",
    );

    const event = outboxEvents[0];

    assert.equal(event?.eventType, "CHAPTER_PUBLISHED");

    assert.equal(event?.aggregateType, "CHAPTER");

    assert.equal(event?.aggregateId, chapterId);

    const payload = event?.payload;

    assert.ok(
        payload && typeof payload === "object" && !Array.isArray(payload),
    );

    const payloadRecord = payload as UnknownRecord;

    assert.equal(payloadRecord.chapterId, chapterId);
});
