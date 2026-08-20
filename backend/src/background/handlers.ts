import { prisma } from "../db/index.js";
import { NotificationRepository } from "../modules/notifications/notifications.repo.js";
import type {
    ClaimedJob,
    ClaimedOutbox,
} from "./queue.repo.js";

const notificationStore = new NotificationRepository();

function payloadObject(payload: unknown): Record<string, unknown> {
    if (
        typeof payload !== "object" ||
        payload === null ||
        Array.isArray(payload)
    ) {
        throw new Error("Job payload must be an object.");
    }

    return payload as Record<string, unknown>;
}

function stringField(payload: Record<string, unknown>, key: string): string {
    const value = payload[key];

    if (typeof value !== "string" || value.length === 0) {
        throw new Error(`Job payload is missing ${key}.`);
    }

    return value;
}

export async function handleJob(
    job: ClaimedJob,
    now = new Date(),
): Promise<void> {
    const payload = payloadObject(job.payload);

    if (job.type === "PUBLISH_STORY") {
        const storyId = stringField(payload, "storyId");

        await prisma.$transaction(async (transaction) => {
            const result = await transaction.story.updateMany({
                where: {
                    id: storyId,

                    status: "SCHEDULED",

                    scheduledAt: {
                        lte: now,
                    },

                    deletedAt: null,

                    chapters: {
                        some: {
                            status: "PUBLISHED",

                            moderationState: "VISIBLE",

                            deletedAt: null,
                        },
                    },
                },

                data: {
                    status: "ONGOING",

                    scheduledAt: null,

                    publishedAt: now,

                    visibility: "PUBLIC",
                },
            });

            if (result.count === 1) {
                await transaction.outboxMessage.create({
                    data: {
                        eventType: "STORY_PUBLISHED",

                        aggregateType: "STORY",

                        aggregateId: storyId,

                        payload: {
                            storyId,

                            publishedAt: now.toISOString(),
                        },
                    },
                });
            }
        });

        return;
    }

    if (job.type === "PUBLISH_CHAPTER") {
        const chapterId = stringField(payload, "chapterId");

        await prisma.$transaction(async (transaction) => {
            const result = await transaction.chapter.updateMany({
                where: {
                    id: chapterId,

                    status: "SCHEDULED",

                    scheduledAt: {
                        lte: now,
                    },

                    deletedAt: null,

                    wordCount: {
                        gt: 0,
                    },
                },

                data: {
                    status: "PUBLISHED",

                    scheduledAt: null,

                    publishedAt: now,

                    version: {
                        increment: 1,
                    },
                },
            });

            if (result.count === 1) {
                await transaction.outboxMessage.create({
                    data: {
                        eventType: "CHAPTER_PUBLISHED",

                        aggregateType: "CHAPTER",

                        aggregateId: chapterId,

                        payload: {
                            chapterId,

                            publishedAt: now.toISOString(),
                        },
                    },
                });
            }
        });

        return;
    }

    if (job.type === "RECONCILE_STORY_COUNTERS") {
        const storyId = stringField(payload, "storyId");

        const [votes, comments, library, qualifiedViews, readers] =
            await Promise.all([
                prisma.chapterVote.count({
                    where: {
                        chapter: {
                            storyId,
                            deletedAt: null,
                        },
                    },
                }),

                prisma.comment.count({
                    where: {
                        chapter: {
                            storyId,
                        },

                        status: "ACTIVE",
                    },
                }),

                prisma.libraryEntry.count({
                    where: {
                        storyId,
                    },
                }),

                prisma.readSignal.count({
                    where: {
                        storyId,
                    },
                }),

                prisma.readSignal.groupBy({
                    by: ["userId"],

                    where: {
                        storyId,

                        userId: {
                            not: null,
                        },
                    },
                }),
            ]);

        await prisma.storyStats.upsert({
            where: {
                storyId,
            },

            create: {
                storyId,

                voteCount: votes,

                commentCount: comments,

                libraryCount: library,

                qualifiedViews,

                authenticatedReaders: readers.length,
            },

            update: {
                voteCount: votes,

                commentCount: comments,

                libraryCount: library,

                qualifiedViews,

                authenticatedReaders: readers.length,
            },
        });

        return;
    }

    throw new Error(`Unsupported job type: ${job.type}`);
}

export async function handleOutbox(message: ClaimedOutbox): Promise<void> {
    if (message.eventType === "STORY_PUBLISHED") {
        const story = await prisma.story.findUnique({
            where: {
                id: message.aggregateId,
            },

            select: {
                id: true,

                title: true,

                authorId: true,

                author: {
                    select: {
                        followers: {
                            select: {
                                followerId: true,
                            },
                        },
                    },
                },
            },
        });

        if (!story) {
            return;
        }

        await prisma.$transaction([
            prisma.job.upsert({
                where: {
                    dedupeKey: `reconcile-story:${message.id}`,
                },

                create: {
                    type: "RECONCILE_STORY_COUNTERS",

                    dedupeKey: `reconcile-story:${message.id}`,

                    payload: {
                        storyId: story.id,

                        eventId: message.id,
                    },
                },

                update: {},
            }),

            ...story.author.followers.map(({ followerId }) =>
                prisma.notification.upsert({
                    where: {
                        dedupeKey: `story-published:${message.id}:${followerId}`,
                    },

                    create: {
                        recipientId: followerId,

                        actorId: story.authorId,

                        dedupeKey: `story-published:${message.id}:${followerId}`,

                        /*
                         * BUG-008:
                         *
                         * قبلاً اشتباهاً
                         * CHAPTER_PUBLISHED بود.
                         */
                        type: "STORY_PUBLISHED",

                        data: {
                            storyId: story.id,

                            storyTitle: story.title,
                        },
                    },

                    update: {},
                }),
            ),
        ]);

        return;
    }

    if (message.eventType === "CHAPTER_PUBLISHED") {
        const chapter = await prisma.chapter.findUnique({
            where: {
                id: message.aggregateId,
            },

            select: {
                id: true,

                title: true,

                story: {
                    select: {
                        id: true,

                        title: true,

                        authorId: true,

                        author: {
                            select: {
                                followers: {
                                    select: {
                                        followerId: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!chapter) {
            return;
        }

        await Promise.all(
            chapter.story.author.followers.map(async ({ followerId }) => {
                if (followerId === chapter.story.authorId) {
                    return;
                }

                const input = {
                    recipientId: followerId,

                    actorId: chapter.story.authorId,

                    dedupeKey: `chapter-published:${message.id}:${followerId}`,

                    type: "CHAPTER_PUBLISHED" as const,

                    data: {
                        storyId: chapter.story.id,

                        storyTitle: chapter.story.title,

                        chapterId: chapter.id,

                        chapterTitle: chapter.title,
                    },
                };

                const shouldDeliver =
                    await notificationStore.shouldDeliver(input);

                if (!shouldDeliver) {
                    return;
                }

                await notificationStore.create(input);
            }),
        );

        return;
    }

    throw new Error(`Unsupported outbox event: ${message.eventType}`);
}
