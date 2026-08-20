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
