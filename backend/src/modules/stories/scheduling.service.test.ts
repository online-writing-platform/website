import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../db/index.js";
import { SchedulingService } from "./scheduling.service.js";

void test("scheduling a chapter reconciles public comment counters before queuing publication", async (t) => {
    const calls: string[] = [];
    const scheduledAt = new Date(Date.now() + 10 * 60_000);
    const transaction = {
        chapter: {
            findFirst: () =>
                Promise.resolve({ id: "chapter-1", version: 4, wordCount: 12 }),
            update: () => {
                calls.push("chapter");
                return Promise.resolve({
                    id: "chapter-1",
                    status: "SCHEDULED" as const,
                    scheduledAt,
                    version: 5,
                });
            },
        },
        $queryRaw: () => {
            calls.push("counter-lock");
            return Promise.resolve([]);
        },
        comment: {
            count: () => {
                calls.push("count-comments");
                return Promise.resolve(0);
            },
        },
        storyStats: {
            upsert: () => {
                calls.push("save-counter");
                return Promise.resolve({});
            },
        },
        job: {
            upsert: () => {
                calls.push("queue-job");
                return Promise.resolve({});
            },
        },
    };
    const prismaTarget = prisma as unknown as {
        $transaction?: (
            callback: (transactionClient: typeof transaction) => Promise<unknown>,
        ) => Promise<unknown>;
    };

    t.mock.property(
        prismaTarget,
        "$transaction",
        (callback: (transactionClient: typeof transaction) => Promise<unknown>) =>
            callback(transaction),
    );

    const result = await new SchedulingService().scheduleChapter(
        "author-1",
        "story-1",
        "chapter-1",
        4,
        scheduledAt,
    );

    assert.equal(result.status, "SCHEDULED");
    assert.deepEqual(calls, [
        "chapter",
        "counter-lock",
        "count-comments",
        "save-counter",
        "queue-job",
    ]);
});
