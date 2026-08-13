import type { Request, Response } from "express";

import AppError from "../../../errors/app-error.js";
import { getValidatedQuery } from "../../../middlewares/validate.middleware.js";
import { contentModule } from "../content.module.js";
import type {
    ChapterRevisionParams,
    RevisionListQuery,
    RevisionParams,
    RestoreRevisionBody,
} from "./revision.schema.js";

function userId(request: Request): string {
    if (!request.auth?.userId) throw AppError.unauthorized();
    return request.auth.userId;
}

export async function listRevisions(request: Request<ChapterRevisionParams>, response: Response) {
    const query = getValidatedQuery<RevisionListQuery>(request);
    const data = await contentModule.revisions.list(
        userId(request), request.params.storyId, request.params.chapterId, query.cursor, query.limit,
    );
    response.status(200).json({ data });
}

export async function restoreRevision(
    request: Request<RevisionParams, unknown, RestoreRevisionBody>,
    response: Response,
) {
    const chapter = await contentModule.revisions.restore(
        userId(request), request.params.storyId, request.params.chapterId,
        request.params.revisionId, request.body.expectedVersion,
    );
    response.status(200).json({ data: { chapter } });
}
