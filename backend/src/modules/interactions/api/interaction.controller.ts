import type { Request, Response } from "express";

import AppError from "../../../errors/app-error.js";
import { getValidatedQuery } from "../../../middlewares/validate.middleware.js";
import { interactionModule } from "../interaction.module.js";
import type {
    ChapterCommentParams,
    ChapterParams,
    CommentParams,
    CreateCommentInput,
    InteractionListQuery,
    UpdateCommentInput,
} from "./interaction.schema.js";

function requireUserId(request: Request): string {
    const userId = request.auth?.userId;

    if (!userId) {
        throw AppError.unauthorized();
    }

    return userId;
}

export async function addVote(
    request: Request<ChapterParams>,
    response: Response,
): Promise<void> {
    const data = await interactionModule.service.addVote(
        requireUserId(request),
        request.params.chapterId,
    );

    response.status(200).json({ data });
}

export async function removeVote(
    request: Request<ChapterParams>,
    response: Response,
): Promise<void> {
    const data = await interactionModule.service.removeVote(
        requireUserId(request),
        request.params.chapterId,
    );

    response.status(200).json({ data });
}

export async function getVoteState(
    request: Request<ChapterParams>,
    response: Response,
): Promise<void> {
    const data = await interactionModule.service.voteState(
        requireUserId(request),
        request.params.chapterId,
    );

    response.status(200).json({ data });
}

export async function getVoteCount(
    request: Request<ChapterParams>,
    response: Response,
): Promise<void> {
    const data = await interactionModule.service.publicVoteCount(
        request.params.chapterId,
    );

    response.status(200).json({ data });
}

export async function createComment(
    request: Request<ChapterParams, unknown, CreateCommentInput>,
    response: Response,
): Promise<void> {
    const comment = await interactionModule.service.createComment(
        requireUserId(request),
        request.params.chapterId,
        request.body.content,
        request.body.parentId,
    );

    response.status(201).json({ data: { comment } });
}

export async function updateComment(
    request: Request<CommentParams, unknown, UpdateCommentInput>,
    response: Response,
): Promise<void> {
    const comment = await interactionModule.service.updateComment(
        requireUserId(request),
        request.params.commentId,
        request.body.content,
    );

    response.status(200).json({ data: { comment } });
}

export async function deleteComment(
    request: Request<CommentParams>,
    response: Response,
): Promise<void> {
    await interactionModule.service.deleteComment(
        requireUserId(request),
        request.params.commentId,
    );

    response.status(204).send();
}

export async function listComments(
    request: Request<ChapterParams>,
    response: Response,
): Promise<void> {
    const query = getValidatedQuery<InteractionListQuery>(request);

    const data = await interactionModule.service.listComments(
        request.params.chapterId,
        query.cursor,
        query.limit,
    );

    response.status(200).json({ data });
}

export async function listReplies(
    request: Request<ChapterCommentParams>,
    response: Response,
): Promise<void> {
    const query = getValidatedQuery<InteractionListQuery>(request);

    const data = await interactionModule.service.listReplies(
        request.params.chapterId,
        request.params.commentId,
        query.cursor,
        query.limit,
    );

    response.status(200).json({ data });
}
