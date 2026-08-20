import { z } from "zod";

import { paginationQuerySchema, uuidSchema } from "../../shared/validation/common.schema.js";

export const notificationListQuerySchema = paginationQuerySchema;

export const notificationParamsSchema = z.object({
    notificationId: uuidSchema,
});

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;
export type NotificationParams = z.infer<typeof notificationParamsSchema>;
