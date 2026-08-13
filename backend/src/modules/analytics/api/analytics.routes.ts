import { Router } from "express";

import { contentWriteRateLimiter } from "../../../middlewares/rate-limit.middleware.js";
import {
    validateBody,
    validateParams,
    validateQuery,
} from "../../../middlewares/validate.middleware.js";
import { authenticate, optionalAuthenticate } from "../../auth/index.js";
import {
    getReadingHistory,
    getStoryAnalytics,
    recordRead,
} from "./analytics.controller.js";
import {
    readingHistoryQuerySchema,
    recordReadSchema,
    storyAnalyticsParamsSchema,
} from "./analytics.schema.js";

const router = Router();

router.get(
    "/history",
    authenticate,
    validateQuery(readingHistoryQuerySchema),
    getReadingHistory,
);
router.post(
    "/reads",
    contentWriteRateLimiter,
    optionalAuthenticate,
    validateBody(recordReadSchema),
    recordRead,
);
router.get(
    "/stories/:storyId",
    authenticate,
    validateParams(storyAnalyticsParamsSchema),
    getStoryAnalytics,
);

export default router;
