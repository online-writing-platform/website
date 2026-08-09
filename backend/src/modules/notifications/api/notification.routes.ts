import { Router } from "express";

import { authenticate } from "../../auth/index.js";
import { validateParams, validateQuery } from "../../../middlewares/validate.middleware.js";
import {
    listNotifications,
    markAllNotificationsRead,
    markNotificationRead,
} from "./notification.controller.js";
import {
    notificationListQuerySchema,
    notificationParamsSchema,
} from "./notification.schema.js";

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
