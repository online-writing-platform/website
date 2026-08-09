import { Router } from "express";

import { moderationRateLimiter, reportRateLimiter } from "../../../middlewares/rate-limit.middleware.js";
import { validateBody, validateParams, validateQuery } from "../../../middlewares/validate.middleware.js";
import { authenticate, requireRole, requireVerifiedEmail } from "../../auth/index.js";
import {
    createReport,
    listReports,
    moderateTarget,
    updateReport,
} from "./moderation.controller.js";
import {
    createReportSchema,
    moderationActionSchema,
    moderationTargetParamsSchema,
    reportListQuerySchema,
    reportParamsSchema,
    updateReportSchema,
} from "./moderation.schema.js";

const reportRoutes = Router();
const moderationRoutes = Router();

reportRoutes.post(
    "/",
    reportRateLimiter,
    authenticate,
    requireVerifiedEmail,
    validateBody(createReportSchema),
    createReport,
);

moderationRoutes.use(moderationRateLimiter, authenticate, requireRole("MODERATOR", "ADMIN"));
moderationRoutes.get("/reports", validateQuery(reportListQuerySchema), listReports);
moderationRoutes.patch("/reports/:reportId", validateParams(reportParamsSchema), validateBody(updateReportSchema), updateReport);
moderationRoutes.post(
    "/targets/:targetType/:targetId/actions",
    validateParams(moderationTargetParamsSchema),
    validateBody(moderationActionSchema),
    moderateTarget,
);

export { moderationRoutes, reportRoutes };
