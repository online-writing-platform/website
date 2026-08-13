import { z } from "zod";

import { pageLimitSchema, uuidSchema } from "../../../shared/validation/common.schema.js";

export const revisionParamsSchema = z.object({
    storyId: uuidSchema,
    chapterId: uuidSchema,
    revisionId: uuidSchema,
}).strict();

export const chapterRevisionParamsSchema = revisionParamsSchema.omit({ revisionId: true });
export const revisionListQuerySchema = z.object({
    cursor: z.coerce.number().int().min(1).optional(),
    limit: pageLimitSchema,
}).strict();
export const restoreRevisionSchema = z.object({ expectedVersion: z.number().int().min(1) }).strict();

export type RevisionParams = z.infer<typeof revisionParamsSchema>;
export type ChapterRevisionParams = z.infer<typeof chapterRevisionParamsSchema>;
export type RevisionListQuery = z.infer<typeof revisionListQuerySchema>;
export type RestoreRevisionBody = z.infer<typeof restoreRevisionSchema>;
