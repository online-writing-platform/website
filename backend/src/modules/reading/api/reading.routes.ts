import { Router } from "express";

import { contentWriteRateLimiter } from "../../../middlewares/rate-limit.middleware.js";
import { validateBody, validateParams, validateQuery } from "../../../middlewares/validate.middleware.js";
import { authenticate, optionalAuthenticate } from "../../auth/index.js";
import {
    addLibrary,
    addReadingListItem,
    createReadingList,
    deleteProgress,
    deleteReadingList,
    getReadingList,
    listLibrary,
    listOwnReadingLists,
    listProgress,
    listPublicReadingLists,
    removeLibrary,
    removeReadingListItem,
    updateProgress,
    updateReadingList,
    reorderReadingListItems,
} from "./reading.controller.js";
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

const libraryRoutes = Router();
const progressRoutes = Router();
const readingListRoutes = Router();
const publicUserReadingListRoutes = Router();

libraryRoutes.use(authenticate);
libraryRoutes.get("/", validateQuery(libraryListQuerySchema), listLibrary);
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
