import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../db/index.js";

import { handleOutbox } from "./handlers.js";

type UnknownRecord = Record<string, unknown>;

void test("CHAPTER_PUBLISHED outbox respects notifyChapterPublished=false", async (t) => {
    const authorId = "11111111-1111-4111-8111-111111111111";

    const followerId = "22222222-2222-4222-8222-222222222222";

    const storyId = "33333333-3333-4333-8333-333333333333";

    const chapterId = "44444444-4444-4444-8444-444444444444";

    const notificationWrites: UnknownRecord[] = [];

    const chapter = {
        id: chapterId,

        title: "فصل جدید",

        story: {
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
        },
    };

    const chapterTarget = prisma.chapter as unknown as {
        findUnique?: (args: unknown) => Promise<unknown>;
    };

    t.mock.property(chapterTarget, "findUnique", () =>
        Promise.resolve(chapter),
    );

    const userTarget = prisma.user as unknown as {
        findUnique?: (args: unknown) => Promise<unknown>;
    };

    t.mock.property(userTarget, "findUnique", () =>
        Promise.resolve({
            status: "ACTIVE",

            preferences: {
                notifyFollow: true,

                notifyComment: true,

                notifyReply: true,

                notifyVote: true,

                notifyChapterPublished: false,

                notifyModeration: true,

                notifySecurity: true,
            },
        }),
    );

    const blockTarget = prisma.block as unknown as {
        findFirst?: (args: unknown) => Promise<unknown>;
    };

    t.mock.property(blockTarget, "findFirst", () => Promise.resolve(null));

    const notificationTarget = prisma.notification as unknown as {
        upsert?: (args: UnknownRecord) => Promise<unknown>;

        create?: (args: UnknownRecord) => Promise<unknown>;
    };

    t.mock.property(notificationTarget, "upsert", (args: UnknownRecord) => {
        notificationWrites.push(args);

        return Promise.resolve({
            id: "notification-1",
        });
    });

    t.mock.property(notificationTarget, "create", (args: UnknownRecord) => {
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

        if (typeof input === "function") {
            return (input as (tx: typeof prisma) => Promise<unknown>)(prisma);
        }

        return Promise.reject(new Error("Unexpected transaction input."));
    });

    const message = {
        id: "outbox-message-1",

        eventType: "CHAPTER_PUBLISHED",

        aggregateType: "CHAPTER",

        aggregateId: chapterId,

        payload: {
            chapterId,

            publishedAt: "2026-08-18T08:00:00.000Z",
        },

        attempts: 1,

        maxAttempts: 5,
    } as Parameters<typeof handleOutbox>[0];

    await handleOutbox(message);

    assert.equal(
        notificationWrites.length,
        0,
        "CHAPTER_PUBLISHED notification must not be created when notifyChapterPublished is false.",
    );
});
