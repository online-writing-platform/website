import type { Request, Response } from "express";

import AppError from "../../../errors/app-error.js";
import { getValidatedQuery } from "../../../middlewares/validate.middleware.js";
import { contentModule } from "../content.module.js";

import type {
    CreateChapterBody,
    CreateStoryBody,
    ListOwnedStoriesQuery,
    ListStoriesQuery,
    PublicChapterParams,
    ReorderChaptersBody,
    StoryChapterParams,
    StoryIdParams,
    StorySlugParams,
    UpdateChapterBody,
    UpdateStoryBody,
    ScheduleChapterPublicationBody,
    SchedulePublicationBody,
} from "./content.schema.js";

function requireUserId(request: Request): string {
    const userId = request.auth?.userId;
    if (!userId) throw AppError.unauthorized();
    return userId;
}

export async function createStory(
    request: Request<Record<string, never>, unknown, CreateStoryBody>,
    response: Response,
): Promise<void> {
    const story = await contentModule.stories.create(requireUserId(request), request.body);
    response.status(201).json({ data: { story } });
}

export async function listStories(request: Request, response: Response): Promise<void> {
    const query = getValidatedQuery<ListStoriesQuery>(request);
    const result = await contentModule.stories.listPublic(
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
    const result = await contentModule.stories.listMine(
        requireUserId(request),
        query.cursor,
        query.limit,
    );
    response.status(200).json({ data: result });
}

export async function listGenres(_request: Request, response: Response): Promise<void> {
    const genres = await contentModule.stories.listGenres();
    response.status(200).json({ data: { genres } });
}

export async function getPublicStory(
    request: Request<StorySlugParams>,
    response: Response,
): Promise<void> {
    const story = await contentModule.stories.getPublic(
        request.params.slug,
        request.auth?.userId,
    );
    response.status(200).json({ data: { story } });
}

export async function getMyStory(
    request: Request<StoryIdParams>,
    response: Response,
): Promise<void> {
    const story = await contentModule.stories.getOwned(
        requireUserId(request),
        request.params.storyId,
    );
    response.status(200).json({ data: { story } });
}

export async function updateStory(
    request: Request<StoryIdParams, unknown, UpdateStoryBody>,
    response: Response,
): Promise<void> {
    const story = await contentModule.stories.update(
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
    await contentModule.stories.remove(requireUserId(request), request.params.storyId);
    response.status(204).send();
}

export async function publishStory(
    request: Request<StoryIdParams>,
    response: Response,
): Promise<void> {
    await contentModule.stories.publish(requireUserId(request), request.params.storyId);
    response.status(204).send();
}

export async function unpublishStory(
    request: Request<StoryIdParams>,
    response: Response,
): Promise<void> {
    await contentModule.stories.unpublish(requireUserId(request), request.params.storyId);
    response.status(204).send();
}

export async function createChapter(
    request: Request<StoryIdParams, unknown, CreateChapterBody>,
    response: Response,
): Promise<void> {
    const chapter = await contentModule.chapters.create(
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
    const chapter = await contentModule.chapters.getOwned(
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
    const chapter = await contentModule.chapters.getPublic(
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
    const chapter = await contentModule.chapters.update(
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
    await contentModule.chapters.remove(
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
    const chapter = await contentModule.chapters.publish(
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
    const chapter = await contentModule.chapters.unpublish(
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
    const chapters = await contentModule.chapters.reorder(
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
    const story = await contentModule.scheduling.scheduleStory(
        requireUserId(request), request.params.storyId, request.body.scheduledAt,
    );
    response.status(200).json({ data: { story } });
}

export async function scheduleChapter(
    request: Request<StoryChapterParams, unknown, ScheduleChapterPublicationBody>,
    response: Response,
): Promise<void> {
    const chapter = await contentModule.scheduling.scheduleChapter(
        requireUserId(request), request.params.storyId, request.params.chapterId,
        request.body.expectedVersion, request.body.scheduledAt,
    );
    response.status(200).json({ data: { chapter } });
}
