import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../db/index.js";

import type { ClaimedJob } from "./queue.repo.js";

import { handleJob } from "./handlers.js";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function matchesScheduledAt(value: Date | null, filter: unknown): boolean {
    if (filter === undefined) {
        return true;
    }

    if (filter instanceof Date) {
        return value !== null && value.getTime() === filter.getTime();
    }

    if (!isRecord(filter)) {
        return true;
    }

    const lte = filter.lte;

    if (lte instanceof Date) {
        return value !== null && value.getTime() <= lte.getTime();
    }

    return true;
}

function matchesWordCount(value: number, filter: unknown): boolean {
    if (filter === undefined) {
        return true;
    }

    if (typeof filter === "number") {
        return value === filter;
    }

    if (!isRecord(filter)) {
        return true;
    }

    if (typeof filter.gt === "number" && !(value > filter.gt)) {
        return false;
    }

    if (typeof filter.gte === "number" && !(value >= filter.gte)) {
        return false;
    }

    if (typeof filter.lt === "number" && !(value < filter.lt)) {
        return false;
    }

    if (typeof filter.lte === "number" && !(value <= filter.lte)) {
        return false;
    }

    if (typeof filter.equals === "number" && value !== filter.equals) {
        return false;
    }

    if (typeof filter.not === "number" && value === filter.not) {
        return false;
    }

    return true;
}

function matchesContent(value: string, filter: unknown): boolean {
    if (filter === undefined) {
        return true;
    }

    if (typeof filter === "string") {
        return value === filter;
    }

    if (!isRecord(filter)) {
        return true;
    }

    if (typeof filter.equals === "string" && value !== filter.equals) {
        return false;
    }

    if (typeof filter.not === "string" && value === filter.not) {
        return false;
    }

    return true;
}

void test("scheduled story is not published if it has no published chapter when the job executes", async (t) => {
    const now = new Date("2026-08-17T09:00:00.000Z");

    const storyState: {
        id: string;
        status: string;
        visibility: string;
        scheduledAt: Date | null;
        publishedAt: Date | null;
        deletedAt: Date | null;
        publishedChapterCount: number;
    } = {
        id: "11111111-1111-4111-8111-111111111111",

        status: "SCHEDULED",

        visibility: "PRIVATE",

        scheduledAt: new Date("2026-08-17T08:59:00.000Z"),

        publishedAt: null,

        deletedAt: null,

        publishedChapterCount: 0,
    };

    const outboxEvents: UnknownRecord[] = [];

    const transaction = {
        story: {
            findFirst: () =>
                Promise.resolve({
                    id: storyState.id,

                    status: storyState.status,

                    scheduledAt: storyState.scheduledAt,

                    deletedAt: storyState.deletedAt,

                    chapters:
                        storyState.publishedChapterCount > 0
                            ? [
                                  {
                                      id: "published-chapter",
                                  },
                              ]
                            : [],
                }),

            findUnique: () =>
                Promise.resolve({
                    id: storyState.id,

                    status: storyState.status,

                    scheduledAt: storyState.scheduledAt,

                    deletedAt: storyState.deletedAt,

                    chapters:
                        storyState.publishedChapterCount > 0
                            ? [
                                  {
                                      id: "published-chapter",
                                  },
                              ]
                            : [],
                }),

            updateMany: ({
                where,
                data,
            }: {
                where: UnknownRecord;
                data: UnknownRecord;
            }) => {
                const idMatches =
                    where.id === undefined || where.id === storyState.id;

                const statusMatches =
                    where.status === undefined ||
                    where.status === storyState.status;

                const deletedAtMatches =
                    where.deletedAt === undefined ||
                    where.deletedAt === storyState.deletedAt;

                const timeMatches = matchesScheduledAt(
                    storyState.scheduledAt,
                    where.scheduledAt,
                );

                let chapterInvariantMatches = true;

                if (
                    isRecord(where.chapters) &&
                    where.chapters.some !== undefined
                ) {
                    chapterInvariantMatches =
                        storyState.publishedChapterCount > 0;
                }

                const matches =
                    idMatches &&
                    statusMatches &&
                    deletedAtMatches &&
                    timeMatches &&
                    chapterInvariantMatches;

                if (!matches) {
                    return Promise.resolve({
                        count: 0,
                    });
                }

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
                    count: 1,
                });
            },
        },

        chapter: {
            count: () => Promise.resolve(storyState.publishedChapterCount),
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

    const job: ClaimedJob = {
        id: "story-job-1",

        type: "PUBLISH_STORY",

        payload: {
            storyId: storyState.id,

            scheduledAt: storyState.scheduledAt?.toISOString(),
        },

        attempts: 1,

        maxAttempts: 5,
    };

    await handleJob(job, now);

    assert.equal(
        storyState.status,
        "SCHEDULED",
        "Story must remain SCHEDULED when no published chapter exists at execution time.",
    );

    assert.equal(
        storyState.visibility,
        "PRIVATE",
        "Story must not become PUBLIC when its publish invariant is no longer valid.",
    );

    assert.equal(
        storyState.publishedAt,
        null,
        "Story must not receive publishedAt when scheduled publication is rejected.",
    );

    assert.equal(
        outboxEvents.length,
        0,
        "STORY_PUBLISHED outbox event must not be emitted for an invalid scheduled publication.",
    );
});

void test("scheduled chapter is not published if it is empty when the job executes", async (t) => {
    const now = new Date("2026-08-17T09:00:00.000Z");

    const chapterState: {
        id: string;
        storyId: string;
        status: string;
        scheduledAt: Date | null;
        publishedAt: Date | null;
        deletedAt: Date | null;
        moderationState: string;
        wordCount: number;
        content: string;
        version: number;
    } = {
        id: "22222222-2222-4222-8222-222222222222",

        storyId: "11111111-1111-4111-8111-111111111111",

        status: "SCHEDULED",

        scheduledAt: new Date("2026-08-17T08:59:00.000Z"),

        publishedAt: null,

        deletedAt: null,

        moderationState: "VISIBLE",

        wordCount: 0,

        content: "",

        version: 7,
    };

    const outboxEvents: UnknownRecord[] = [];

    const transaction = {
        chapter: {
            findFirst: () =>
                Promise.resolve({
                    id: chapterState.id,

                    storyId: chapterState.storyId,

                    status: chapterState.status,

                    scheduledAt: chapterState.scheduledAt,

                    deletedAt: chapterState.deletedAt,

                    wordCount: chapterState.wordCount,

                    content: chapterState.content,

                    version: chapterState.version,
                }),

            findUnique: () =>
                Promise.resolve({
                    id: chapterState.id,

                    storyId: chapterState.storyId,

                    status: chapterState.status,

                    scheduledAt: chapterState.scheduledAt,

                    deletedAt: chapterState.deletedAt,

                    wordCount: chapterState.wordCount,

                    content: chapterState.content,

                    version: chapterState.version,
                }),

            updateMany: ({
                where,
                data,
            }: {
                where: UnknownRecord;
                data: UnknownRecord;
            }) => {
                const idMatches =
                    where.id === undefined || where.id === chapterState.id;

                const statusMatches =
                    where.status === undefined ||
                    where.status === chapterState.status;

                const deletedAtMatches =
                    where.deletedAt === undefined ||
                    where.deletedAt === chapterState.deletedAt;

                const timeMatches = matchesScheduledAt(
                    chapterState.scheduledAt,
                    where.scheduledAt,
                );

                const wordCountMatches = matchesWordCount(
                    chapterState.wordCount,
                    where.wordCount,
                );

                const contentMatches = matchesContent(
                    chapterState.content,
                    where.content,
                );

                const matches =
                    idMatches &&
                    statusMatches &&
                    deletedAtMatches &&
                    timeMatches &&
                    wordCountMatches &&
                    contentMatches;

                if (!matches) {
                    return Promise.resolve({
                        count: 0,
                    });
                }

                if (typeof data.status === "string") {
                    chapterState.status = data.status;
                }

                if (data.scheduledAt === null) {
                    chapterState.scheduledAt = null;
                }

                if (data.publishedAt instanceof Date) {
                    chapterState.publishedAt = data.publishedAt;
                }

                if (
                    isRecord(data.version) &&
                    typeof data.version.increment === "number"
                ) {
                    chapterState.version += data.version.increment;
                }

                return Promise.resolve({
                    count: 1,
                });
            },
        },

        outboxMessage: {
            create: ({ data }: { data: UnknownRecord }) => {
                outboxEvents.push(data);

                return Promise.resolve({
                    id: "outbox-2",

                    ...data,
                });
            },
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

    const job: ClaimedJob = {
        id: "chapter-job-1",

        type: "PUBLISH_CHAPTER",

        payload: {
            chapterId: chapterState.id,

            scheduledAt: chapterState.scheduledAt?.toISOString(),
        },

        attempts: 1,

        maxAttempts: 5,
    };

    await handleJob(job, now);

    assert.equal(
        chapterState.status,
        "SCHEDULED",
        "Empty scheduled chapter must not become PUBLISHED.",
    );

    assert.equal(
        chapterState.publishedAt,
        null,
        "Empty chapter must not receive publishedAt.",
    );

    assert.equal(
        chapterState.version,
        7,
        "Rejected scheduled publication must not increment the chapter version.",
    );

    assert.equal(
        outboxEvents.length,
        0,
        "CHAPTER_PUBLISHED outbox event must not be emitted for an empty chapter.",
    );
});
