import { prisma } from "../../db/index.js";
import { buildCursorPage } from "../../shared/pagination/page.js";

import type {
    CreateNotificationInput,
    NotificationRecord,
    NotificationStore,
    NotificationTypeValue,
} from "./notification.types.js";

const preferenceField: Record<
    NotificationTypeValue,
    | "notifyFollow"
    | "notifyComment"
    | "notifyReply"
    | "notifyVote"
    | "notifyChapterPublished"
    | "notifyModeration"
    | "notifySecurity"
> = {
    FOLLOW: "notifyFollow",

    COMMENT: "notifyComment",

    COMMENT_REPLY: "notifyReply",

    CHAPTER_VOTE: "notifyVote",

    STORY_PUBLISHED: "notifyChapterPublished",

    CHAPTER_PUBLISHED: "notifyChapterPublished",

    MODERATION: "notifyModeration",

    SECURITY: "notifySecurity",
};

export class NotificationRepository implements NotificationStore {
    public async shouldDeliver(
        input: CreateNotificationInput,
    ): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: {
                id: input.recipientId,
            },

            select: {
                status: true,

                preferences: {
                    select: {
                        notifyFollow: true,

                        notifyComment: true,

                        notifyReply: true,

                        notifyVote: true,

                        notifyChapterPublished: true,

                        notifyModeration: true,

                        notifySecurity: true,
                    },
                },
            },
        });

        if (!user || user.status !== "ACTIVE") {
            return false;
        }

        if (
            user.preferences &&
            user.preferences[preferenceField[input.type]] === false
        ) {
            return false;
        }

        if (input.actorId) {
            const block = await prisma.block.findFirst({
                where: {
                    OR: [
                        {
                            blockerId: input.recipientId,

                            blockedId: input.actorId,
                        },

                        {
                            blockerId: input.actorId,

                            blockedId: input.recipientId,
                        },
                    ],
                },

                select: {
                    blockerId: true,
                },
            });

            if (block) {
                return false;
            }
        }

        return true;
    }

    public async create(input: CreateNotificationInput): Promise<void> {
        const data = {
            recipientId: input.recipientId,

            ...(input.actorId
                ? {
                      actorId: input.actorId,
                  }
                : {}),

            type: input.type,

            data: input.data,

            ...(input.dedupeKey
                ? {
                      dedupeKey: input.dedupeKey,
                  }
                : {}),
        };

        if (input.dedupeKey) {
            await prisma.notification.upsert({
                where: {
                    dedupeKey: input.dedupeKey,
                },

                update: {},

                create: data,

                select: {
                    id: true,
                },
            });

            return;
        }

        await prisma.notification.create({
            data,

            select: {
                id: true,
            },
        });
    }

    public async list(
        recipientId: string,
        cursor: string | undefined,
        limit: number,
    ): Promise<{
        items: NotificationRecord[];

        hasMore: boolean;

        nextCursor: string | null;
    }> {
        const rows: NotificationRecord[] = await prisma.notification.findMany({
            where: {
                recipientId,
            },

            orderBy: [
                {
                    createdAt: "desc",
                },

                {
                    id: "desc",
                },
            ],

            take: limit + 1,

            ...(cursor
                ? {
                      cursor: {
                          id: cursor,
                      },

                      skip: 1,
                  }
                : {}),

            select: {
                id: true,

                type: true,

                data: true,

                readAt: true,

                createdAt: true,

                actor: {
                    select: {
                        username: true,

                        displayName: true,

                        avatarUrl: true,
                    },
                },
            },
        });

        const page = buildCursorPage(rows, limit, (item) => item.id);

        return {
            items: page.items,

            hasMore: page.pagination.hasMore,

            nextCursor: page.pagination.nextCursor,
        };
    }

    public async markRead(
        recipientId: string,
        notificationId: string,
        readAt: Date,
    ): Promise<boolean> {
        const result = await prisma.notification.updateMany({
            where: {
                id: notificationId,

                recipientId,
            },

            data: {
                readAt,
            },
        });

        return result.count === 1;
    }

    public async markAllRead(
        recipientId: string,
        readAt: Date,
    ): Promise<number> {
        const result = await prisma.notification.updateMany({
            where: {
                recipientId,

                readAt: null,
            },

            data: {
                readAt,
            },
        });

        return result.count;
    }
}
