import type { Request, Response } from "express";

import AppError from "../../../errors/app-error.js";
import { getValidatedQuery } from "../../../middlewares/validate.middleware.js";
import { analyticsModule } from "../analytics.module.js";
import type {
    RecordReadBody,
    ReadingHistoryQuery,
    StoryAnalyticsParams,
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
    await analyticsModule.service.recordRead(
        requireUserId(request),
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
    const data = await analyticsModule.service.listReadingHistory(
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
    const analytics = await analyticsModule.service.story(
        requireUserId(request),
        request.params.storyId,
    );
    response.status(200).json({ data: { analytics } });
}
