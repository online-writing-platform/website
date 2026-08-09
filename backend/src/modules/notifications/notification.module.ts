import logger from "../../config/logger.js";

import { NotificationPublisher, NotificationService } from "./application/notification.service.js";
import { PrismaNotificationStore } from "./infrastructure/prisma-notification.store.js";

const store = new PrismaNotificationStore();
const notificationLogger = {
    error(error: unknown, context: Record<string, unknown>, message: string) {
        logger.error({ ...context, err: error }, message);
    },
};

export const notificationModule = {
    publisher: new NotificationPublisher(store, notificationLogger),
    service: new NotificationService(store),
};
