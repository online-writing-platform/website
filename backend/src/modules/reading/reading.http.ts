import type { Request, Response } from "express";
import AppError from "../../errors/app-error.js";
import { getValidatedQuery } from "../../middlewares/validate.middleware.js";
import { readingServices } from "./reading.service.js";
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
import { Router } from "express";
import { contentWriteRateLimiter } from "../../middlewares/rate-limit.middleware.js";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware.js";
import { authenticate, optionalAuthenticate } from "../auth/auth.middleware.js";
import {
    addReadingListItemSchema,
    createReadingListSchema,
    libraryListQuerySchema,
    progressSchema,
    publicReadingListsParamsSchema,
    readingListItemParamsSchema,
    readingListParamsSchema,
    storyIdParamsSchema,
    updateReadingListSchema,
    reorderReadingListSchema,
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

    const data = await readingServices.service.list(
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
    const inLibrary = await readingServices.service.contains(
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
    await readingServices.service.add(
        requireUserId(request),
        request.params.storyId,
    );

    response.status(204).send();
}

export async function removeLibrary(
    request: Request<StoryIdParams>,
    response: Response,
): Promise<void> {
    await readingServices.service.remove(
        requireUserId(request),
        request.params.storyId,
    );

    response.status(204).send();
}

export async function updateProgress(
    request: Request<Record<string, never>, unknown, ProgressInput>,
    response: Response,
): Promise<void> {
    const progress = await readingServices.service.updateProgress(
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

    const data = await readingServices.service.listProgress(
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
    await readingServices.service.deleteProgress(
        requireUserId(request),
        request.params.storyId,
    );

    response.status(204).send();
}

export async function createReadingList(
    request: Request<Record<string, never>, unknown, CreateReadingListInput>,
    response: Response,
): Promise<void> {
    const list = await readingServices.service.createList(
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
    const list = await readingServices.service.updateList(
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
    await readingServices.service.deleteList(
        requireUserId(request),
        request.params.listId,
    );

    response.status(204).send();
}

export async function listOwnReadingLists(
    request: Request,
    response: Response,
): Promise<void> {
    const lists = await readingServices.service.listOwnLists(
        requireUserId(request),
    );

    response.status(200).json({ data: { lists } });
}

export async function listPublicReadingLists(
    request: Request<PublicReadingListsParams>,
    response: Response,
): Promise<void> {
    const lists = await readingServices.service.listPublicLists(
        request.params.username,
        request.auth?.userId,
    );

    response.status(200).json({ data: { lists } });
}

export async function getReadingList(
    request: Request<ReadingListParams>,
    response: Response,
): Promise<void> {
    const data = await readingServices.service.getList(
        request.params.listId,
        request.auth?.userId,
    );

    response.status(200).json({ data });
}

export async function addReadingListItem(
    request: Request<ReadingListParams, unknown, AddReadingListItemInput>,
    response: Response,
): Promise<void> {
    await readingServices.service.addListItem(
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
    await readingServices.service.removeListItem(
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
    const result = await readingServices.service.reorderListItems(
        requireUserId(request),
        request.params.listId,
        request.body.storyIds,
        request.body.expectedOrderingVersion,
    );
    response.status(200).json({ data: result });
}

const libraryRoutes = Router();
const progressRoutes = Router();
const readingListRoutes = Router();
const publicUserReadingListRoutes = Router();

libraryRoutes.use(authenticate);
libraryRoutes.get("/", validateQuery(libraryListQuerySchema), listLibrary);
libraryRoutes.get("/:storyId", validateParams(storyIdParamsSchema), getLibraryStatus);
libraryRoutes.post("/:storyId", contentWriteRateLimiter, validateParams(storyIdParamsSchema), addLibrary);
libraryRoutes.delete("/:storyId", contentWriteRateLimiter, validateParams(storyIdParamsSchema), removeLibrary);

progressRoutes.use(authenticate);
progressRoutes.get("/", validateQuery(libraryListQuerySchema), listProgress);
progressRoutes.put("/", contentWriteRateLimiter, validateBody(progressSchema), updateProgress);
progressRoutes.delete("/:storyId", validateParams(storyIdParamsSchema), deleteProgress);

readingListRoutes.get(
    "/:listId",
    optionalAuthenticate,
    validateParams(readingListParamsSchema),
    getReadingList,
);
readingListRoutes.get("/", authenticate, listOwnReadingLists);
readingListRoutes.post("/", contentWriteRateLimiter, authenticate, validateBody(createReadingListSchema), createReadingList);
readingListRoutes.patch("/:listId", contentWriteRateLimiter, authenticate, validateParams(readingListParamsSchema), validateBody(updateReadingListSchema), updateReadingList);
readingListRoutes.delete("/:listId", contentWriteRateLimiter, authenticate, validateParams(readingListParamsSchema), deleteReadingList);
readingListRoutes.post("/:listId/items", contentWriteRateLimiter, authenticate, validateParams(readingListParamsSchema), validateBody(addReadingListItemSchema), addReadingListItem);
readingListRoutes.patch("/:listId/items/order", contentWriteRateLimiter, authenticate, validateParams(readingListParamsSchema), validateBody(reorderReadingListSchema), reorderReadingListItems);
readingListRoutes.delete("/:listId/items/:storyId", contentWriteRateLimiter, authenticate, validateParams(readingListItemParamsSchema), removeReadingListItem);

publicUserReadingListRoutes.get(
    "/:username/reading-lists",
    optionalAuthenticate,
    validateParams(publicReadingListsParamsSchema),
    listPublicReadingLists,
);

export { libraryRoutes, progressRoutes, readingListRoutes, publicUserReadingListRoutes };
