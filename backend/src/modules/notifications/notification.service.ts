import logger from "../../config/logger.js";
import AppError from "../../errors/app-error.js";
import { type CreateNotificationInput, type NotificationLogger, type NotificationStore } from "./notification.types.js";
import { NotificationRepository } from "./notifications.repo.js";

export class NotificationPublisher {
    public constructor(
        private readonly store: NotificationStore,
        private readonly logger: NotificationLogger,
    ) {}

    public async publish(input: CreateNotificationInput): Promise<void> {
        if (input.actorId && input.actorId === input.recipientId) return;

        try {
            if (!(await this.store.shouldDeliver(input))) return;
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

    public async markRead(
        userId: string,
        notificationId: string,
    ): Promise<void> {
        const updated = await this.store.markRead(
            userId,
            notificationId,
            new Date(),
        );

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

const store = new NotificationRepository();

const notificationLogger = {
    error(error: unknown, context: Record<string, unknown>, message: string) {
        logger.error({ ...context, err: error }, message);
    },
};

export const notificationServices = {
    publisher: new NotificationPublisher(store, notificationLogger),
    service: new NotificationService(store),
};
