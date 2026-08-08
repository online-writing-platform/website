import type { Request, Response } from "express";

import AppError from "../../errors/app-error.js";

import { listPublicStories } from "./story.service.js";

function parseCursor(value: unknown): string | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (typeof value !== "string") {
        throw AppError.badRequest(
            "The cursor query parameter must be a single string.",
            "INVALID_STORY_CURSOR",
        );
    }

    const cursor = value.trim();

    return cursor.length > 0 ? cursor : undefined;
}

export async function getStories(
    request: Request,
    response: Response,
): Promise<void> {
    const result = await listPublicStories(parseCursor(request.query.cursor));

    response.status(200).json({
        data: result,
    });
}
