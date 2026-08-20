import AppError from "../../errors/app-error.js";
import { getValidatedQuery } from "../../middlewares/validate.middleware.js";
import { type ChapterRevisionParams, type RestoreRevisionBody, type RevisionListQuery, type RevisionParams } from "./stories.schema.js";
import { type CreateChapterBody, type CreateStoryBody, type ListOwnedStoriesQuery, type ListStoriesQuery, type PublicChapterParams, type ReorderChaptersBody, type ScheduleChapterPublicationBody, type SchedulePublicationBody, type StoryChapterParams, type StoryIdParams, type StorySlugParams, type UpdateChapterBody, type UpdateStoryBody } from "./stories.schema.js";
import { storiesServices } from "./stories.service.js";
import { type Request, type Response } from "express";
import { Router } from "express";
import { contentWriteRateLimiter } from "../../middlewares/rate-limit.middleware.js";
import {
    validateBody,
    validateParams,
    validateQuery,
} from "../../middlewares/validate.middleware.js";
import {
    authenticate,
    optionalAuthenticate,
    requireVerifiedEmail,
} from "../auth/auth.middleware.js";
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
} from "./stories.schema.js";
import {
    chapterRevisionParamsSchema,
    restoreRevisionSchema,
    revisionListQuerySchema,
    revisionParamsSchema,
} from "./stories.schema.js";

function requireUserId(request: Request): string {
    const userId = request.auth?.userId;
    if (!userId) throw AppError.unauthorized();
    return userId;
}

export async function createStory(
    request: Request<Record<string, never>, unknown, CreateStoryBody>,
    response: Response,
): Promise<void> {
    const story = await storiesServices.stories.create(requireUserId(request), request.body);
    response.status(201).json({ data: { story } });
}

export async function listStories(request: Request, response: Response): Promise<void> {
    const query = getValidatedQuery<ListStoriesQuery>(request);
    const result = await storiesServices.stories.listPublic(
        query.cursor,
        query.limit,
        {
            ...(query.genre ? { genre: query.genre } : {}),
            ...(query.tag ? { tag: query.tag } : {}),
            ...(query.language ? { language: query.language } : {}),
            ...(query.author ? { author: query.author } : {}),
        },
        request.auth?.userId,
    );
    response.status(200).json({ data: result });
}

export async function listMyStories(request: Request, response: Response): Promise<void> {
    const query = getValidatedQuery<ListOwnedStoriesQuery>(request);
    const result = await storiesServices.stories.listMine(
        requireUserId(request),
        query.cursor,
        query.limit,
    );
    response.status(200).json({ data: result });
}

export async function listGenres(_request: Request, response: Response): Promise<void> {
    const genres = await storiesServices.stories.listGenres();
    response.status(200).json({ data: { genres } });
}

export async function getPublicStory(
    request: Request<StorySlugParams>,
    response: Response,
): Promise<void> {
    const story = await storiesServices.stories.getPublic(
        request.params.slug,
        request.auth?.userId,
    );
    response.status(200).json({ data: { story } });
}

export async function getMyStory(
    request: Request<StoryIdParams>,
    response: Response,
): Promise<void> {
    const story = await storiesServices.stories.getOwned(
        requireUserId(request),
        request.params.storyId,
    );
    response.status(200).json({ data: { story } });
}

export async function updateStory(
    request: Request<StoryIdParams, unknown, UpdateStoryBody>,
    response: Response,
): Promise<void> {
    const story = await storiesServices.stories.update(
        requireUserId(request),
        request.params.storyId,
        request.body,
    );
    response.status(200).json({ data: { story } });
}

export async function deleteStory(
    request: Request<StoryIdParams>,
    response: Response,
): Promise<void> {
    await storiesServices.stories.remove(requireUserId(request), request.params.storyId);
    response.status(204).send();
}

export async function publishStory(
    request: Request<StoryIdParams>,
    response: Response,
): Promise<void> {
    await storiesServices.stories.publish(requireUserId(request), request.params.storyId);
    response.status(204).send();
}

export async function unpublishStory(
    request: Request<StoryIdParams>,
    response: Response,
): Promise<void> {
    await storiesServices.stories.unpublish(requireUserId(request), request.params.storyId);
    response.status(204).send();
}

export async function createChapter(
    request: Request<StoryIdParams, unknown, CreateChapterBody>,
    response: Response,
): Promise<void> {
    const chapter = await storiesServices.chapters.create(
        requireUserId(request),
        request.params.storyId,
        request.body,
    );
    response.status(201).json({ data: { chapter } });
}

export async function getMyChapter(
    request: Request<StoryChapterParams>,
    response: Response,
): Promise<void> {
    const chapter = await storiesServices.chapters.getOwned(
        requireUserId(request),
        request.params.storyId,
        request.params.chapterId,
    );
    response.status(200).json({ data: { chapter } });
}

export async function getPublicChapter(
    request: Request<PublicChapterParams>,
    response: Response,
): Promise<void> {
    const chapter = await storiesServices.chapters.getPublic(
        request.params.slug,
        request.params.chapterId,
        request.auth?.userId,
    );
    response.status(200).json({ data: { chapter } });
}

export async function updateChapter(
    request: Request<StoryChapterParams, unknown, UpdateChapterBody>,
    response: Response,
): Promise<void> {
    const chapter = await storiesServices.chapters.update(
        requireUserId(request),
        request.params.storyId,
        request.params.chapterId,
        request.body,
    );
    response.status(200).json({ data: { chapter } });
}

export async function deleteChapter(
    request: Request<StoryChapterParams>,
    response: Response,
): Promise<void> {
    await storiesServices.chapters.remove(
        requireUserId(request),
        request.params.storyId,
        request.params.chapterId,
    );
    response.status(204).send();
}

export async function publishChapter(
    request: Request<StoryChapterParams>,
    response: Response,
): Promise<void> {
    const chapter = await storiesServices.chapters.publish(
        requireUserId(request),
        request.params.storyId,
        request.params.chapterId,
    );
    response.status(200).json({ data: { chapter } });
}

export async function unpublishChapter(
    request: Request<StoryChapterParams>,
    response: Response,
): Promise<void> {
    const chapter = await storiesServices.chapters.unpublish(
        requireUserId(request),
        request.params.storyId,
        request.params.chapterId,
    );
    response.status(200).json({ data: { chapter } });
}

export async function reorderChapters(
    request: Request<StoryIdParams, unknown, ReorderChaptersBody>,
    response: Response,
): Promise<void> {
    const chapters = await storiesServices.chapters.reorder(
        requireUserId(request),
        request.params.storyId,
        request.body.chapterIds,
        request.body.expectedOrderingVersion,
    );
    response.status(200).json({ data: { chapters } });
}

export async function scheduleStory(
    request: Request<StoryIdParams, unknown, SchedulePublicationBody>,
    response: Response,
): Promise<void> {
    const story = await storiesServices.scheduling.scheduleStory(
        requireUserId(request), request.params.storyId, request.body.scheduledAt,
    );
    response.status(200).json({ data: { story } });
}

export async function scheduleChapter(
    request: Request<StoryChapterParams, unknown, ScheduleChapterPublicationBody>,
    response: Response,
): Promise<void> {
    const chapter = await storiesServices.scheduling.scheduleChapter(
        requireUserId(request), request.params.storyId, request.params.chapterId,
        request.body.expectedVersion, request.body.scheduledAt,
    );
    response.status(200).json({ data: { chapter } });
}

function userId(request: Request): string {
    if (!request.auth?.userId) throw AppError.unauthorized();
    return request.auth.userId;
}

export async function listRevisions(request: Request<ChapterRevisionParams>, response: Response) {
    const query = getValidatedQuery<RevisionListQuery>(request);
    const data = await storiesServices.revisions.list(
        userId(request), request.params.storyId, request.params.chapterId, query.cursor, query.limit,
    );
    response.status(200).json({ data });
}

export async function restoreRevision(
    request: Request<RevisionParams, unknown, RestoreRevisionBody>,
    response: Response,
) {
    const chapter = await storiesServices.revisions.restore(
        userId(request), request.params.storyId, request.params.chapterId,
        request.params.revisionId, request.body.expectedVersion,
    );
    response.status(200).json({ data: { chapter } });
}

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
