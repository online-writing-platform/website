import type { Request, Response } from "express";

import AppError from "../../../errors/app-error.js";
import { getValidatedQuery } from "../../../middlewares/validate.middleware.js";
import { readingModule } from "../reading.module.js";
import type {
    AddReadingListItemInput,
    CreateReadingListInput,
    LibraryListQuery,
    ProgressInput,
    PublicReadingListsParams,
    ReadingListItemParams,
    ReadingListParams,
    StoryIdParams,
    UpdateReadingListInput,
    ReorderReadingListInput,
} from "./reading.schema.js";

function requireUserId(request: Request): string {
    const userId = request.auth?.userId;

    if (!userId) {
        throw AppError.unauthorized();
    }

    return userId;
}

export async function listLibrary(
    request: Request,
    response: Response,
): Promise<void> {
    const query = getValidatedQuery<LibraryListQuery>(request);

    const data = await readingModule.service.list(
        requireUserId(request),
        query.cursor,
        query.limit,
    );

    response.status(200).json({ data });
}

export async function getLibraryStatus(
    request: Request<StoryIdParams>,
    response: Response,
): Promise<void> {
    const inLibrary = await readingModule.service.contains(
        requireUserId(request),
        request.params.storyId,
    );

    response.status(200).json({
        data: {
            inLibrary,
        },
    });
}

export async function addLibrary(
    request: Request<StoryIdParams>,
    response: Response,
): Promise<void> {
    await readingModule.service.add(
        requireUserId(request),
        request.params.storyId,
    );

    response.status(204).send();
}

export async function removeLibrary(
    request: Request<StoryIdParams>,
    response: Response,
): Promise<void> {
    await readingModule.service.remove(
        requireUserId(request),
        request.params.storyId,
    );

    response.status(204).send();
}

export async function updateProgress(
    request: Request<Record<string, never>, unknown, ProgressInput>,
    response: Response,
): Promise<void> {
    const progress = await readingModule.service.updateProgress(
        requireUserId(request),
        request.body.storyId,
        request.body.chapterId,
        request.body.progress,
        request.body.anchor,
        request.body.qualified,
    );

    response.status(200).json({ data: { progress } });
}

export async function listProgress(
    request: Request,
    response: Response,
): Promise<void> {
    const query = getValidatedQuery<LibraryListQuery>(request);

    const data = await readingModule.service.listProgress(
        requireUserId(request),
        query.cursor,
        query.limit,
    );

    response.status(200).json({ data });
}

export async function deleteProgress(
    request: Request<StoryIdParams>,
    response: Response,
): Promise<void> {
    await readingModule.service.deleteProgress(
        requireUserId(request),
        request.params.storyId,
    );

    response.status(204).send();
}

export async function createReadingList(
    request: Request<Record<string, never>, unknown, CreateReadingListInput>,
    response: Response,
): Promise<void> {
    const list = await readingModule.service.createList(
        requireUserId(request),
        request.body.name,
        request.body.description,
        request.body.isPublic,
    );

    response.status(201).json({ data: { list } });
}

export async function updateReadingList(
    request: Request<ReadingListParams, unknown, UpdateReadingListInput>,
    response: Response,
): Promise<void> {
    const list = await readingModule.service.updateList(
        requireUserId(request),
        request.params.listId,
        request.body,
    );

    response.status(200).json({ data: { list } });
}

export async function deleteReadingList(
    request: Request<ReadingListParams>,
    response: Response,
): Promise<void> {
    await readingModule.service.deleteList(
        requireUserId(request),
        request.params.listId,
    );

    response.status(204).send();
}

export async function listOwnReadingLists(
    request: Request,
    response: Response,
): Promise<void> {
    const lists = await readingModule.service.listOwnLists(
        requireUserId(request),
    );

    response.status(200).json({ data: { lists } });
}

export async function listPublicReadingLists(
    request: Request<PublicReadingListsParams>,
    response: Response,
): Promise<void> {
    const lists = await readingModule.service.listPublicLists(
        request.params.username,
        request.auth?.userId,
    );

    response.status(200).json({ data: { lists } });
}

export async function getReadingList(
    request: Request<ReadingListParams>,
    response: Response,
): Promise<void> {
    const data = await readingModule.service.getList(
        request.params.listId,
        request.auth?.userId,
    );

    response.status(200).json({ data });
}

export async function addReadingListItem(
    request: Request<ReadingListParams, unknown, AddReadingListItemInput>,
    response: Response,
): Promise<void> {
    await readingModule.service.addListItem(
        requireUserId(request),
        request.params.listId,
        request.body.storyId,
    );

    response.status(204).send();
}

export async function removeReadingListItem(
    request: Request<ReadingListItemParams>,
    response: Response,
): Promise<void> {
    await readingModule.service.removeListItem(
        requireUserId(request),
        request.params.listId,
        request.params.storyId,
    );

    response.status(204).send();
}

export async function reorderReadingListItems(
    request: Request<ReadingListParams, unknown, ReorderReadingListInput>,
    response: Response,
): Promise<void> {
    const result = await readingModule.service.reorderListItems(
        requireUserId(request),
        request.params.listId,
        request.body.storyIds,
        request.body.expectedOrderingVersion,
    );
    response.status(200).json({ data: result });
}
