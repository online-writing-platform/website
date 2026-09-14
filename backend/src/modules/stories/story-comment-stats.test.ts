import assert from "node:assert/strict";
import test from "node:test";

import type { Prisma } from "../../generated/prisma/client.js";
import { reconcileStoryCommentCount } from "./story-comment-stats.js";

void test("public story comment counters include only active comments on readable chapters", async () => {
    let countArguments: unknown;
    let upsertArguments: unknown;
    let lockAcquired = false;
    const transaction = {
        $queryRaw: () => {
            lockAcquired = true;
            return Promise.resolve([]);
        },
        comment: {
            count: (arguments_: unknown) => {
                countArguments = arguments_;
                return Promise.resolve(7);
            },
        },
        storyStats: {
            upsert: (arguments_: unknown) => {
                upsertArguments = arguments_;
                return Promise.resolve({});
            },
        },
    } as unknown as Prisma.TransactionClient;

    await reconcileStoryCommentCount(transaction, "story-1");

    assert.equal(lockAcquired, true);
    assert.deepEqual(countArguments, {
        where: {
            status: "ACTIVE",
            OR: [
                { parentId: null },
                { parent: { status: { not: "HIDDEN" } } },
            ],
            chapter: {
                storyId: "story-1",
                deletedAt: null,
                status: "PUBLISHED",
                moderationState: "VISIBLE",
            },
        },
    });
    assert.deepEqual(upsertArguments, {
        where: { storyId: "story-1" },
        create: { storyId: "story-1", commentCount: 7 },
        update: { commentCount: 7 },
    });
});
