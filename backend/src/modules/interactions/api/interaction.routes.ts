import { Router } from "express";

import { socialWriteRateLimiter } from "../../../middlewares/rate-limit.middleware.js";
import { validateBody, validateParams, validateQuery } from "../../../middlewares/validate.middleware.js";
import { authenticate, requireVerifiedEmail } from "../../auth/index.js";
import {
    addVote,
    createComment,
    deleteComment,
    getVoteCount,
    getVoteState,
    listComments,
    listReplies,
    removeVote,
    updateComment,
} from "./interaction.controller.js";
import {
    chapterCommentParamsSchema,
    chapterParamsSchema,
    commentParamsSchema,
    createCommentSchema,
    interactionListQuerySchema,
    updateCommentSchema,
} from "./interaction.schema.js";

const chapterRouter = Router();
const commentRouter = Router();

chapterRouter.get("/:chapterId/votes", validateParams(chapterParamsSchema), getVoteCount);
chapterRouter.get(
    "/:chapterId/vote",
    authenticate,
    validateParams(chapterParamsSchema),
    getVoteState,
);
chapterRouter.post(
    "/:chapterId/vote",
    socialWriteRateLimiter,
    authenticate,
    requireVerifiedEmail,
    validateParams(chapterParamsSchema),
    addVote,
);
chapterRouter.delete(
    "/:chapterId/vote",
    socialWriteRateLimiter,
    authenticate,
    requireVerifiedEmail,
    validateParams(chapterParamsSchema),
    removeVote,
);
chapterRouter.get(
    "/:chapterId/comments",
    validateParams(chapterParamsSchema),
    validateQuery(interactionListQuerySchema),
    listComments,
);
chapterRouter.get(
    "/:chapterId/comments/:commentId/replies",
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
