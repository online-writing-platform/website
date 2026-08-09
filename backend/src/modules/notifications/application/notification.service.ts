import AppError from "../../../errors/app-error.js";

import type {
    CreateNotificationInput,
    NotificationLogger,
    NotificationStore,
} from "./notification.ports.js";

export class NotificationPublisher {
    public constructor(
        private readonly store: NotificationStore,
        private readonly logger: NotificationLogger,
    ) {}

    public async publish(input: CreateNotificationInput): Promise<void> {
        if (input.actorId && input.actorId === input.recipientId) {
            return;
        }

        try {
            await this.store.create(input);
        } catch (error) {
            this.logger.error(
                error,
                {
                    recipientId: input.recipientId,
                    actorId: input.actorId,
                    type: input.type,
                },
                "Failed to create notification",
            );
        }
    }
}

export class NotificationService {
    public constructor(private readonly store: NotificationStore) {}

    public list(userId: string, cursor: string | undefined, limit: number) {
        return this.store.list(userId, cursor, limit);
    }

    public async markRead(userId: string, notificationId: string): Promise<void> {
        const updated = await this.store.markRead(userId, notificationId, new Date());

        if (!updated) {
            throw AppError.notFound(
                "The notification was not found.",
                "NOTIFICATION_NOT_FOUND",
            );
        }
    }

    public markAllRead(userId: string): Promise<number> {
        return this.store.markAllRead(userId, new Date());
    }
}
