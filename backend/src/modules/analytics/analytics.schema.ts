import { z } from "zod";

import { paginationQuerySchema, uuidSchema } from "../../shared/validation/common.schema.js";

export const storyAnalyticsParamsSchema = z
    .object({ storyId: uuidSchema })
    .strict();

export const readingHistoryQuerySchema = paginationQuerySchema;

export const recordReadSchema = z
    .object({
        storyId: uuidSchema,
        chapterId: uuidSchema,
        engagedSeconds: z.number().int().min(10).max(3_600),
        progressDelta: z.number().min(0.05).max(1),
    })
    .strict();

export type StoryAnalyticsParams = z.infer<
    typeof storyAnalyticsParamsSchema
>;
export type RecordReadBody = z.infer<typeof recordReadSchema>;

export type ReadingHistoryQuery = z.infer<typeof readingHistoryQuerySchema>;
