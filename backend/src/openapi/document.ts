import {
    extendZodWithOpenApi,
    OpenAPIRegistry,
    OpenApiGeneratorV31,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

import {
    createChapterSchema,
    createStorySchema,
    scheduleChapterPublicationSchema,
    schedulePublicationSchema,
    updateChapterSchema,
} from "../modules/stories/stories.schema.js";
import { progressSchema } from "../modules/reading/reading.schema.js";
import { searchQuerySchema } from "../modules/discovery/search/search.schema.js";
import {
    createCommentSchema,
    interactionListQuerySchema,
    updateCommentSchema,
} from "../modules/interactions/interaction.schema.js";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();
const errorSchema = z.object({
    error: z.object({
        code: z.string(),
        message: z.string(),
        details: z.unknown().optional(),
        requestId: z.string(),
    }),
});
const commentParams = z.object({
    chapterId: z.string().uuid(),
    commentId: z.string().uuid(),
});
const commentSchema = z.object({
    id: z.string().uuid(),
    chapterId: z.string().uuid(),
    parentId: z.string().uuid().nullable(),
    content: z.string(),
    status: z.enum(["ACTIVE", "HIDDEN", "DELETED"]),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    replyCount: z.number().int().nonnegative(),
    author: z
        .object({
            id: z.string().uuid(),
            username: z.string(),
            displayName: z.string(),
            avatarUrl: z.string().url().nullable(),
        })
        .nullable(),
});
const commentResponseSchema = z.object({
    data: z.object({ comment: commentSchema }),
});
const commentPageResponseSchema = z.object({
    data: z.object({
        comments: z.array(commentSchema),
        pagination: z.object({
            hasMore: z.boolean(),
            nextCursor: z.string().nullable(),
        }),
    }),
});

function jsonResponse(description: string, schema: z.ZodType) {
    return {
        description,
        content: { "application/json": { schema } },
    };
}

registry.register("Error", errorSchema);
registry.registerPath({
    method: "post",
    path: "/api/v1/stories",
    summary: "Create a draft story",
    request: { body: { content: { "application/json": { schema: createStorySchema } } } },
    responses: { 201: jsonResponse("Created", z.object({ data: z.object({ story: z.unknown() }) })), 422: jsonResponse("Validation failure", errorSchema) },
});
registry.registerPath({
    method: "post",
    path: "/api/v1/stories/{storyId}/chapters",
    summary: "Create a draft chapter",
    request: {
        params: z.object({ storyId: z.string().uuid() }),
        body: { content: { "application/json": { schema: createChapterSchema } } },
    },
    responses: { 201: jsonResponse("Created", z.object({ data: z.object({ chapter: z.unknown() }) })) },
});
registry.registerPath({
    method: "patch",
    path: "/api/v1/stories/{storyId}/chapters/{chapterId}",
    summary: "Optimistically save a chapter draft",
    request: {
        params: z.object({ storyId: z.string().uuid(), chapterId: z.string().uuid() }),
        body: { content: { "application/json": { schema: updateChapterSchema } } },
    },
    responses: { 200: jsonResponse("Saved", z.object({ data: z.object({ chapter: z.unknown() }) })), 409: jsonResponse("Version conflict", errorSchema) },
});
registry.registerPath({
    method: "post",
    path: "/api/v1/stories/{storyId}/schedule",
    summary: "Schedule story publication",
    request: { params: z.object({ storyId: z.string().uuid() }), body: { content: { "application/json": { schema: schedulePublicationSchema } } } },
    responses: { 200: jsonResponse("Scheduled", z.object({ data: z.unknown() })) },
});
registry.registerPath({
    method: "post",
    path: "/api/v1/stories/{storyId}/chapters/{chapterId}/schedule",
    summary: "Schedule chapter publication",
    request: { params: z.object({ storyId: z.string().uuid(), chapterId: z.string().uuid() }), body: { content: { "application/json": { schema: scheduleChapterPublicationSchema } } } },
    responses: { 200: jsonResponse("Scheduled", z.object({ data: z.unknown() })) },
});
registry.registerPath({
    method: "put",
    path: "/api/v1/reading-progress",
    summary: "Synchronize current reading progress",
    request: { body: { content: { "application/json": { schema: progressSchema } } } },
    responses: { 200: jsonResponse("Updated", z.object({ data: z.unknown() })) },
});
registry.registerPath({
    method: "get",
    path: "/api/v1/search",
    summary: "Search public stories, users, and tags",
    request: { query: searchQuerySchema },
    responses: { 200: jsonResponse("Search results", z.object({ data: z.unknown() })) },
});
registry.registerPath({
    method: "get",
    path: "/api/v1/chapters/{chapterId}/comments",
    summary: "List top-level chapter comments",
    request: {
        params: z.object({ chapterId: z.string().uuid() }),
        query: interactionListQuerySchema,
    },
    responses: {
        200: jsonResponse("Comment page", commentPageResponseSchema),
        404: jsonResponse("Chapter not found", errorSchema),
    },
});
registry.registerPath({
    method: "get",
    path: "/api/v1/chapters/{chapterId}/comments/{commentId}",
    summary: "Get one visible chapter comment",
    request: { params: commentParams },
    responses: {
        200: jsonResponse("Comment", commentResponseSchema),
        404: jsonResponse("Comment not found", errorSchema),
    },
});
registry.registerPath({
    method: "get",
    path: "/api/v1/chapters/{chapterId}/comments/{commentId}/replies",
    summary: "List replies to a top-level comment",
    request: { params: commentParams, query: interactionListQuerySchema },
    responses: {
        200: jsonResponse("Reply page", commentPageResponseSchema),
        404: jsonResponse("Comment not found", errorSchema),
    },
});
registry.registerPath({
    method: "post",
    path: "/api/v1/chapters/{chapterId}/comments",
    summary: "Create a comment or one-level reply",
    request: {
        params: z.object({ chapterId: z.string().uuid() }),
        body: { content: { "application/json": { schema: createCommentSchema } } },
    },
    responses: {
        201: jsonResponse("Created", commentResponseSchema),
        422: jsonResponse("Validation failure", errorSchema),
    },
});
registry.registerPath({
    method: "patch",
    path: "/api/v1/comments/{commentId}",
    summary: "Edit an owned active comment",
    request: {
        params: z.object({ commentId: z.string().uuid() }),
        body: { content: { "application/json": { schema: updateCommentSchema } } },
    },
    responses: {
        200: jsonResponse("Updated", commentResponseSchema),
        404: jsonResponse("Comment not found", errorSchema),
    },
});
registry.registerPath({
    method: "delete",
    path: "/api/v1/comments/{commentId}",
    summary: "Soft-delete an owned active comment",
    request: { params: z.object({ commentId: z.string().uuid() }) },
    responses: {
        204: { description: "Deleted" },
        404: jsonResponse("Comment not found", errorSchema),
    },
});

export function createOpenApiDocument() {
    return new OpenApiGeneratorV31(registry.definitions).generateDocument({
        openapi: "3.1.0",
        info: {
            title: "Online Writing Platform API",
            version: "2.0.0",
            description: "Production backend API for social reading and writing.",
        },
        servers: [{ url: "/" }],
        security: [{ bearerAuth: [] }],
    });
}
