import type { Request, Response } from "express";
import AppError from "../../errors/app-error.js";
import { getValidatedQuery } from "../../middlewares/validate.middleware.js";
import { notificationServices } from "./notification.service.js";
import type {
    NotificationListQuery,
    NotificationParams,
} from "./notification.schema.js";
import { Router } from "express";
import { authenticate } from "../auth/auth.middleware.js";
import { validateParams, validateQuery } from "../../middlewares/validate.middleware.js";
import {
    notificationListQuerySchema,
    notificationParamsSchema,
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

    const result = await notificationServices.service.list(
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
    await notificationServices.service.markRead(
        requireUserId(request),
        request.params.notificationId,
    );

    response.status(204).send();
}

export async function markAllNotificationsRead(
    request: Request,
    response: Response,
): Promise<void> {
    const updated = await notificationServices.service.markAllRead(
        requireUserId(request),
    );

    response.status(200).json({ data: { updated } });
}

const router = Router();

router.use(authenticate);
router.get("/", validateQuery(notificationListQuerySchema), listNotifications);
router.post("/read-all", markAllNotificationsRead);
router.post(
    "/:notificationId/read",
    validateParams(notificationParamsSchema),
    markNotificationRead,
);

export default router;
