import type { Request, Response } from "express";

import AppError from "../../../errors/app-error.js";
import { getValidatedQuery } from "../../../middlewares/validate.middleware.js";
import { notificationModule } from "../notification.module.js";
import type {
    NotificationListQuery,
    NotificationParams,
} from "./notification.schema.js";

function requireUserId(request: Request): string {
    const userId = request.auth?.userId;

    if (!userId) {
        throw AppError.unauthorized();
    }

    return userId;
}

export async function listNotifications(
    request: Request,
    response: Response,
): Promise<void> {
    const query = getValidatedQuery<NotificationListQuery>(request);

    const result = await notificationModule.service.list(
        requireUserId(request),
        query.cursor,
        query.limit,
    );

    response.status(200).json({ data: result });
}

export async function markNotificationRead(
    request: Request<NotificationParams>,
    response: Response,
): Promise<void> {
    await notificationModule.service.markRead(
        requireUserId(request),
        request.params.notificationId,
    );

    response.status(204).send();
}

export async function markAllNotificationsRead(
    request: Request,
    response: Response,
): Promise<void> {
    const updated = await notificationModule.service.markAllRead(
        requireUserId(request),
    );

    response.status(200).json({ data: { updated } });
}
