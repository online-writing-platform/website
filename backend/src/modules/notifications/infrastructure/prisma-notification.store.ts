import { prisma } from "../../../db/index.js";
import { buildCursorPage } from "../../../shared/pagination/page.js";

import type {
    CreateNotificationInput,
    NotificationRecord,
    NotificationStore,
} from "../application/notification.ports.js";

export class PrismaNotificationStore implements NotificationStore {
    public async create(input: CreateNotificationInput): Promise<void> {
        await prisma.notification.create({
            data: {
                recipientId: input.recipientId,
                ...(input.actorId ? { actorId: input.actorId } : {}),
                type: input.type,
                data: input.data,
            },
            select: { id: true },
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
            where: { recipientId },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
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
            where: { id: notificationId, recipientId },
            data: { readAt },
        });

        return result.count === 1;
    }

    public async markAllRead(recipientId: string, readAt: Date): Promise<number> {
        const result = await prisma.notification.updateMany({
            where: { recipientId, readAt: null },
            data: { readAt },
        });

        return result.count;
    }
}
