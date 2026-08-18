import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../../db/index.js";

import { PrismaContentStore } from "./prisma-content.store.js";

type UnknownRecord = Record<string, unknown>;

void test("manual publish of a scheduled story makes it immediately readable", async (t) => {
    const publishedAt = new Date("2026-08-18T08:00:00.000Z");

    const storyState: {
        id: string;
        authorId: string;
        status: string;
        visibility: string;
        scheduledAt: Date | null;
        publishedAt: Date | null;
        deletedAt: Date | null;
    } = {
        id: "11111111-1111-4111-8111-111111111111",

        authorId: "22222222-2222-4222-8222-222222222222",

        status: "SCHEDULED",

        visibility: "PRIVATE",

        scheduledAt: new Date("2026-08-18T12:00:00.000Z"),

        publishedAt: null,

        deletedAt: null,
    };

    const publishedChapterCount = 1;

    const transaction = {
        story: {
            findFirst: () =>
                Promise.resolve({
                    id: storyState.id,

                    authorId: storyState.authorId,

                    status: storyState.status,

                    visibility: storyState.visibility,

                    scheduledAt: storyState.scheduledAt,

                    publishedAt: storyState.publishedAt,

                    deletedAt: storyState.deletedAt,
                }),

            findUnique: () =>
                Promise.resolve({
                    id: storyState.id,

                    authorId: storyState.authorId,

                    status: storyState.status,

                    visibility: storyState.visibility,

                    scheduledAt: storyState.scheduledAt,

                    publishedAt: storyState.publishedAt,

                    deletedAt: storyState.deletedAt,
                }),

            update: ({
                data,
            }: {
                where: UnknownRecord;
                data: UnknownRecord;
            }) => {
                if (typeof data.status === "string") {
                    storyState.status = data.status;
                }

                if (typeof data.visibility === "string") {
                    storyState.visibility = data.visibility;
                }

                if (data.scheduledAt === null) {
                    storyState.scheduledAt = null;
                }

                if (data.publishedAt instanceof Date) {
                    storyState.publishedAt = data.publishedAt;
                }

                return Promise.resolve({
                    id: storyState.id,

                    authorId: storyState.authorId,

                    status: storyState.status,

                    visibility: storyState.visibility,

                    scheduledAt: storyState.scheduledAt,

                    publishedAt: storyState.publishedAt,

                    deletedAt: storyState.deletedAt,
                });
            },
        },

        chapter: {
            count: () => Promise.resolve(publishedChapterCount),
        },
    };

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

    const result = await store.publishStory(
        storyState.authorId,
        storyState.id,
        publishedAt,
    );

    assert.equal(result, "PUBLISHED");

    assert.equal(
        storyState.status,
        "ONGOING",
        "Manual publish of a SCHEDULED story must transition it to ONGOING.",
    );

    assert.equal(
        storyState.visibility,
        "PUBLIC",
        "Manually published story must become PUBLIC.",
    );

    assert.equal(
        storyState.publishedAt?.getTime(),
        publishedAt.getTime(),
        "Manually published story must receive publishedAt.",
    );
});
