import type { Request, Response } from "express";

import AppError from "../../../errors/app-error.js";
import { getValidatedQuery } from "../../../middlewares/validate.middleware.js";
import { storyModule } from "../story.module.js";

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
} from "./story.schema.js";

function requireUserId(request: Request): string {
    const userId = request.auth?.userId;

    if (!userId) {
        throw AppError.unauthorized();
    }

    return userId;
}

export async function createStory(
    request: Request<Record<string, never>, unknown, CreateStoryBody>,
    response: Response,
): Promise<void> {
    const story = await storyModule.stories.create(
        requireUserId(request),
        request.body,
    );

    response.status(201).json({ data: { story } });
}

export async function listStories(
    request: Request,
    response: Response,
): Promise<void> {
    const query = getValidatedQuery<ListStoriesQuery>(request);

    const result = await storyModule.stories.listPublic(
        query.cursor,
        query.limit,
        {
            ...(query.genre ? { genre: query.genre } : {}),
            ...(query.tag ? { tag: query.tag } : {}),
            ...(query.language ? { language: query.language } : {}),
            ...(query.author ? { author: query.author } : {}),
        },
    );

    response.status(200).json({ data: result });
}

export async function listMyStories(
    request: Request,
    response: Response,
): Promise<void> {
    const query = getValidatedQuery<ListOwnedStoriesQuery>(request);

    const result = await storyModule.stories.listMine(
        requireUserId(request),
        query.cursor,
        query.limit,
    );

    response.status(200).json({ data: result });
}

export async function listGenres(
    _request: Request,
    response: Response,
): Promise<void> {
    const genres = await storyModule.stories.listGenres();

    response.status(200).json({ data: { genres } });
}

export async function getPublicStory(
    request: Request<StorySlugParams>,
    response: Response,
): Promise<void> {
    const story = await storyModule.stories.getPublic(request.params.slug);

    response.status(200).json({ data: { story } });
}

export async function getMyStory(
    request: Request<StoryIdParams>,
    response: Response,
): Promise<void> {
    const story = await storyModule.stories.getOwned(
        requireUserId(request),
        request.params.storyId,
    );

    response.status(200).json({ data: { story } });
}

export async function updateStory(
    request: Request<StoryIdParams, unknown, UpdateStoryBody>,
    response: Response,
): Promise<void> {
    const story = await storyModule.stories.update(
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
    await storyModule.stories.remove(
        requireUserId(request),
        request.params.storyId,
    );

    response.status(204).send();
}

export async function publishStory(
    request: Request<StoryIdParams>,
    response: Response,
): Promise<void> {
    await storyModule.stories.publish(
        requireUserId(request),
        request.params.storyId,
    );

    response.status(204).send();
}

export async function unpublishStory(
    request: Request<StoryIdParams>,
    response: Response,
): Promise<void> {
    await storyModule.stories.unpublish(
        requireUserId(request),
        request.params.storyId,
    );

    response.status(204).send();
}

export async function createChapter(
    request: Request<StoryIdParams, unknown, CreateChapterBody>,
    response: Response,
): Promise<void> {
    const chapter = await storyModule.chapters.create(
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
    const chapter = await storyModule.chapters.getOwned(
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
    const chapter = await storyModule.chapters.getPublic(
        request.params.slug,
        request.params.chapterId,
    );

    response.status(200).json({ data: { chapter } });
}

export async function updateChapter(
    request: Request<StoryChapterParams, unknown, UpdateChapterBody>,
    response: Response,
): Promise<void> {
    const chapter = await storyModule.chapters.update(
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
    await storyModule.chapters.remove(
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
    const chapter = await storyModule.chapters.publish(
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
    const chapter = await storyModule.chapters.unpublish(
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
    const chapters = await storyModule.chapters.reorder(
        requireUserId(request),
        request.params.storyId,
        request.body.chapterIds,
    );

    response.status(200).json({ data: { chapters } });
}
