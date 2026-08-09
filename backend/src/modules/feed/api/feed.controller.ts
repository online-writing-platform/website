import type { Request, Response } from "express";

import AppError from "../../../errors/app-error.js";
import { getValidatedQuery } from "../../../middlewares/validate.middleware.js";
import { feedModule } from "../feed.module.js";
import type { FeedQuery } from "./feed.schema.js";

export async function getFeed(
    request: Request,
    response: Response,
): Promise<void> {
    const userId = request.auth?.userId;

    if (!userId) {
        throw AppError.unauthorized();
    }

    const query = getValidatedQuery<FeedQuery>(request);

    const data = await feedModule.service.list(
        userId,
        query.cursor,
        query.limit,
    );

    response.status(200).json({ data });
}
