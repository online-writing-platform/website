import type { Request, Response } from "express";
import AppError from "../../errors/app-error.js";
import { getValidatedQuery } from "../../middlewares/validate.middleware.js";
import { interactionServices } from "./interaction.service.js";
import type {
    ChapterCommentParams,
    ChapterParams,
    CommentParams,
    CreateCommentInput,
    InteractionListQuery,
    UpdateCommentInput,
} from "./interaction.schema.js";
import { Router } from "express";
import { socialWriteRateLimiter } from "../../middlewares/rate-limit.middleware.js";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware.js";
import {
    authenticate,
    optionalAuthenticate,
    requireVerifiedEmail,
} from "../auth/auth.middleware.js";
import {
    chapterCommentParamsSchema,
    chapterParamsSchema,
    commentParamsSchema,
    createCommentSchema,
    interactionListQuerySchema,
    updateCommentSchema,
} from "./interaction.schema.js";

function requireUserId(request: Request): string {
    const userId = request.auth?.userId;
    if (!userId) throw AppError.unauthorized();
    return userId;
}

export async function addVote(request: Request<ChapterParams>, response: Response): Promise<void> {
    const data = await interactionServices.service.addVote(requireUserId(request), request.params.chapterId);
    response.status(200).json({ data });
}

export async function removeVote(request: Request<ChapterParams>, response: Response): Promise<void> {
    const data = await interactionServices.service.removeVote(requireUserId(request), request.params.chapterId);
    response.status(200).json({ data });
}

export async function getVoteState(request: Request<ChapterParams>, response: Response): Promise<void> {
    const data = await interactionServices.service.voteState(requireUserId(request), request.params.chapterId);
    response.status(200).json({ data });
}

export async function getVoteCount(request: Request<ChapterParams>, response: Response): Promise<void> {
    const data = await interactionServices.service.publicVoteCount(
        request.params.chapterId,
        request.auth?.userId,
    );
    response.status(200).json({ data });
}

export async function createComment(
    request: Request<ChapterParams, unknown, CreateCommentInput>,
    response: Response,
): Promise<void> {
    const comment = await interactionServices.service.createComment(
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
    const comment = await interactionServices.service.updateComment(
        requireUserId(request),
        request.params.commentId,
        request.body.content,
    );
    response.status(200).json({ data: { comment } });
}

export async function deleteComment(request: Request<CommentParams>, response: Response): Promise<void> {
    await interactionServices.service.deleteComment(requireUserId(request), request.params.commentId);
    response.status(204).send();
}

export async function listComments(request: Request<ChapterParams>, response: Response): Promise<void> {
    const query = getValidatedQuery<InteractionListQuery>(request);
    const data = await interactionServices.service.listComments(
        request.params.chapterId,
        query.cursor,
        query.limit,
        request.auth?.userId,
    );
    response.status(200).json({ data });
}

export async function listReplies(request: Request<ChapterCommentParams>, response: Response): Promise<void> {
    const query = getValidatedQuery<InteractionListQuery>(request);
    const data = await interactionServices.service.listReplies(
        request.params.chapterId,
        request.params.commentId,
        query.cursor,
        query.limit,
        request.auth?.userId,
    );
    response.status(200).json({ data });
}

const chapterRouter = Router();
const commentRouter = Router();

chapterRouter.get("/:chapterId/votes", optionalAuthenticate, validateParams(chapterParamsSchema), getVoteCount);
chapterRouter.get("/:chapterId/vote", authenticate, validateParams(chapterParamsSchema), getVoteState);
chapterRouter.post("/:chapterId/vote", socialWriteRateLimiter, authenticate, requireVerifiedEmail, validateParams(chapterParamsSchema), addVote);
chapterRouter.delete("/:chapterId/vote", socialWriteRateLimiter, authenticate, requireVerifiedEmail, validateParams(chapterParamsSchema), removeVote);
chapterRouter.get(
    "/:chapterId/comments",
    optionalAuthenticate,
    validateParams(chapterParamsSchema),
    validateQuery(interactionListQuerySchema),
    listComments,
);
chapterRouter.get(
    "/:chapterId/comments/:commentId/replies",
    optionalAuthenticate,
    validateParams(chapterCommentParamsSchema),
    validateQuery(interactionListQuerySchema),
    listReplies,
);
chapterRouter.post(
    "/:chapterId/comments",
    socialWriteRateLimiter,
    authenticate,
    requireVerifiedEmail,
    validateParams(chapterParamsSchema),
    validateBody(createCommentSchema),
    createComment,
);

commentRouter.patch(
    "/:commentId",
    socialWriteRateLimiter,
    authenticate,
    requireVerifiedEmail,
    validateParams(commentParamsSchema),
    validateBody(updateCommentSchema),
    updateComment,
);
commentRouter.delete(
    "/:commentId",
    socialWriteRateLimiter,
    authenticate,
    validateParams(commentParamsSchema),
    deleteComment,
);

export { chapterRouter, commentRouter };
