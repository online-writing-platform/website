import type { Request, Response } from "express";

import AppError from "../../../errors/app-error.js";
import { getValidatedQuery } from "../../../middlewares/validate.middleware.js";
import { libraryModule } from "../library.module.js";
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
} from "./library.schema.js";

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

    const data = await libraryModule.service.list(
        requireUserId(request),
        query.cursor,
        query.limit,
    );

    response.status(200).json({ data });
}

export async function addLibrary(
    request: Request<StoryIdParams>,
    response: Response,
): Promise<void> {
    await libraryModule.service.add(
        requireUserId(request),
        request.params.storyId,
    );

    response.status(204).send();
}

export async function removeLibrary(
    request: Request<StoryIdParams>,
    response: Response,
): Promise<void> {
    await libraryModule.service.remove(
        requireUserId(request),
        request.params.storyId,
    );

    response.status(204).send();
}

export async function updateProgress(
    request: Request<Record<string, never>, unknown, ProgressInput>,
    response: Response,
): Promise<void> {
    const progress = await libraryModule.service.updateProgress(
        requireUserId(request),
        request.body.storyId,
        request.body.chapterId,
        request.body.progress,
    );

    response.status(200).json({ data: { progress } });
}

export async function listProgress(
    request: Request,
    response: Response,
): Promise<void> {
    const query = getValidatedQuery<LibraryListQuery>(request);

    const data = await libraryModule.service.listProgress(
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
    await libraryModule.service.deleteProgress(
        requireUserId(request),
        request.params.storyId,
    );

    response.status(204).send();
}

export async function createReadingList(
    request: Request<Record<string, never>, unknown, CreateReadingListInput>,
    response: Response,
): Promise<void> {
    const list = await libraryModule.service.createList(
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
    const list = await libraryModule.service.updateList(
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
    await libraryModule.service.deleteList(
        requireUserId(request),
        request.params.listId,
    );

    response.status(204).send();
}

export async function listOwnReadingLists(
    request: Request,
    response: Response,
): Promise<void> {
    const lists = await libraryModule.service.listOwnLists(
        requireUserId(request),
    );

    response.status(200).json({ data: { lists } });
}

export async function listPublicReadingLists(
    request: Request<PublicReadingListsParams>,
    response: Response,
): Promise<void> {
    const lists = await libraryModule.service.listPublicLists(
        request.params.username,
        request.auth?.userId,
    );

    response.status(200).json({ data: { lists } });
}

export async function getReadingList(
    request: Request<ReadingListParams>,
    response: Response,
): Promise<void> {
    const data = await libraryModule.service.getList(
        request.params.listId,
        request.auth?.userId,
    );

    response.status(200).json({ data });
}

export async function addReadingListItem(
    request: Request<ReadingListParams, unknown, AddReadingListItemInput>,
    response: Response,
): Promise<void> {
    await libraryModule.service.addListItem(
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
    await libraryModule.service.removeListItem(
        requireUserId(request),
        request.params.listId,
        request.params.storyId,
    );

    response.status(204).send();
}
