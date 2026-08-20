import type { Request, Response } from "express";
import { createHmac } from "node:crypto";
import AppError from "../../errors/app-error.js";
import env from "../../config/env.js";
import { getValidatedQuery } from "../../middlewares/validate.middleware.js";
import { analyticsServices } from "./analytics.service.js";
import type {
    RecordReadBody,
    ReadingHistoryQuery,
    StoryAnalyticsParams,
} from "./analytics.schema.js";
import { Router } from "express";
import { contentWriteRateLimiter } from "../../middlewares/rate-limit.middleware.js";
import {
    validateBody,
    validateParams,
    validateQuery,
} from "../../middlewares/validate.middleware.js";
import { authenticate, optionalAuthenticate } from "../auth/auth.middleware.js";
import {
    readingHistoryQuerySchema,
    recordReadSchema,
    storyAnalyticsParamsSchema,
} from "./analytics.schema.js";

function requireUserId(request: Request): string {
    const userId = request.auth?.userId;
    if (!userId) throw AppError.unauthorized();
    return userId;
}

export async function recordRead(
    request: Request<Record<string, never>, unknown, RecordReadBody>,
    response: Response,
): Promise<void> {
    const authenticatedUserId = request.auth?.userId;
    const anonymousVisitor = request.get("x-reader-visitor")?.trim();
    if (
        !authenticatedUserId &&
        (!anonymousVisitor || !/^[A-Za-z0-9_-]{32,128}$/u.test(anonymousVisitor))
    ) {
        throw AppError.validation(
            "Anonymous qualified reads require a valid X-Reader-Visitor identifier.",
            "ANONYMOUS_VISITOR_REQUIRED",
        );
    }
    const day = new Date().toISOString().slice(0, 10);
    const visitorKey = createHmac("sha256", env.cursorSecret)
        .update(
            authenticatedUserId
                ? `user:${authenticatedUserId}`
                : `anonymous:${anonymousVisitor}:${day}`,
        )
        .digest("hex");
    await analyticsServices.service.recordRead(
        authenticatedUserId,
        visitorKey,
        request.body.storyId,
        request.body.chapterId,
    );
    response.status(204).send();
}

export async function getReadingHistory(
    request: Request,
    response: Response,
): Promise<void> {
    const query = getValidatedQuery<ReadingHistoryQuery>(request);
    const data = await analyticsServices.service.listReadingHistory(
        requireUserId(request),
        query.cursor,
        query.limit,
    );
    response.status(200).json({ data });
}

export async function getStoryAnalytics(
    request: Request<StoryAnalyticsParams>,
    response: Response,
): Promise<void> {
    const analytics = await analyticsServices.service.story(
        requireUserId(request),
        request.params.storyId,
    );
    response.status(200).json({ data: { analytics } });
}

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
