import { Router } from "express";

import { contentWriteRateLimiter } from "../../../middlewares/rate-limit.middleware.js";
import {
    validateBody,
    validateParams,
    validateQuery,
} from "../../../middlewares/validate.middleware.js";
import {
    authenticate,
    optionalAuthenticate,
    requireVerifiedEmail,
} from "../../auth/index.js";

import {
    createChapter,
    createStory,
    deleteChapter,
    deleteStory,
    getMyChapter,
    getMyStory,
    getPublicChapter,
    getPublicStory,
    listGenres,
    listMyStories,
    listStories,
    publishChapter,
    reorderChapters,
    publishStory,
    scheduleChapter,
    scheduleStory,
    unpublishChapter,
    unpublishStory,
    updateChapter,
    updateStory,
} from "./content.controller.js";
import {
    createChapterSchema,
    createStorySchema,
    listOwnedStoriesQuerySchema,
    listStoriesQuerySchema,
    publicChapterParamsSchema,
    reorderChaptersSchema,
    storyChapterParamsSchema,
    storyIdParamsSchema,
    storySlugParamsSchema,
    updateChapterSchema,
    updateStorySchema,
    scheduleChapterPublicationSchema,
    schedulePublicationSchema,
} from "./content.schema.js";
import { listRevisions, restoreRevision } from "./revision.controller.js";
import {
    chapterRevisionParamsSchema,
    restoreRevisionSchema,
    revisionListQuerySchema,
    revisionParamsSchema,
} from "./revision.schema.js";

const router = Router();

router.get("/genres", listGenres);
router.get("/", optionalAuthenticate, validateQuery(listStoriesQuerySchema), listStories);

router.get("/mine", authenticate, validateQuery(listOwnedStoriesQuerySchema), listMyStories);
router.get("/mine/:storyId", authenticate, validateParams(storyIdParamsSchema), getMyStory);
router.get(
    "/mine/:storyId/chapters/:chapterId",
    authenticate,
    validateParams(storyChapterParamsSchema),
    getMyChapter,
);
router.get(
    "/mine/:storyId/chapters/:chapterId/revisions",
    authenticate,
    validateParams(chapterRevisionParamsSchema),
    validateQuery(revisionListQuerySchema),
    listRevisions,
);
router.post(
    "/mine/:storyId/chapters/:chapterId/revisions/:revisionId/restore",
    contentWriteRateLimiter,
    authenticate,
    requireVerifiedEmail,
    validateParams(revisionParamsSchema),
    validateBody(restoreRevisionSchema),
    restoreRevision,
);

router.post(
    "/",
    contentWriteRateLimiter,
    authenticate,
    requireVerifiedEmail,
    validateBody(createStorySchema),
    createStory,
);
router.patch(
    "/:storyId",
    contentWriteRateLimiter,
    authenticate,
    requireVerifiedEmail,
    validateParams(storyIdParamsSchema),
    validateBody(updateStorySchema),
    updateStory,
);
router.delete(
    "/:storyId",
    contentWriteRateLimiter,
    authenticate,
    requireVerifiedEmail,
    validateParams(storyIdParamsSchema),
    deleteStory,
);
router.post(
    "/:storyId/publish",
    contentWriteRateLimiter,
    authenticate,
    requireVerifiedEmail,
    validateParams(storyIdParamsSchema),
    publishStory,
);
router.post(
    "/:storyId/schedule",
    contentWriteRateLimiter,
    authenticate,
    requireVerifiedEmail,
    validateParams(storyIdParamsSchema),
    validateBody(schedulePublicationSchema),
    scheduleStory,
);
router.post(
    "/:storyId/unpublish",
    contentWriteRateLimiter,
    authenticate,
    requireVerifiedEmail,
    validateParams(storyIdParamsSchema),
    unpublishStory,
);
router.patch(
    "/:storyId/chapters/order",
    contentWriteRateLimiter,
    authenticate,
    requireVerifiedEmail,
    validateParams(storyIdParamsSchema),
    validateBody(reorderChaptersSchema),
    reorderChapters,
);
router.post(
    "/:storyId/chapters",
    contentWriteRateLimiter,
    authenticate,
    requireVerifiedEmail,
    validateParams(storyIdParamsSchema),
    validateBody(createChapterSchema),
    createChapter,
);
router.patch(
    "/:storyId/chapters/:chapterId",
    contentWriteRateLimiter,
    authenticate,
    requireVerifiedEmail,
    validateParams(storyChapterParamsSchema),
    validateBody(updateChapterSchema),
    updateChapter,
);
router.delete(
    "/:storyId/chapters/:chapterId",
    contentWriteRateLimiter,
    authenticate,
    requireVerifiedEmail,
    validateParams(storyChapterParamsSchema),
    deleteChapter,
);
router.post(
    "/:storyId/chapters/:chapterId/publish",
    contentWriteRateLimiter,
    authenticate,
    requireVerifiedEmail,
    validateParams(storyChapterParamsSchema),
    publishChapter,
);
router.post(
    "/:storyId/chapters/:chapterId/schedule",
    contentWriteRateLimiter,
    authenticate,
    requireVerifiedEmail,
    validateParams(storyChapterParamsSchema),
    validateBody(scheduleChapterPublicationSchema),
    scheduleChapter,
);
router.post(
    "/:storyId/chapters/:chapterId/unpublish",
    contentWriteRateLimiter,
    authenticate,
    requireVerifiedEmail,
    validateParams(storyChapterParamsSchema),
    unpublishChapter,
);

router.get(
    "/:slug/chapters/:chapterId",
    optionalAuthenticate,
    validateParams(publicChapterParamsSchema),
    getPublicChapter,
);
router.get(
    "/:slug",
    optionalAuthenticate,
    validateParams(storySlugParamsSchema),
    getPublicStory,
);

export default router;
