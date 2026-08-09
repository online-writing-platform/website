import { z } from "zod";

import { paginationQuerySchema, uuidSchema } from "../../../shared/validation/common.schema.js";

export const chapterParamsSchema = z.object({ chapterId: uuidSchema });
export const commentParamsSchema = z.object({ commentId: uuidSchema });
export const chapterCommentParamsSchema = z.object({ chapterId: uuidSchema, commentId: uuidSchema });
export const interactionListQuerySchema = paginationQuerySchema;

export const createCommentSchema = z
    .object({
        content: z.string().trim().min(1).max(2000),
        parentId: uuidSchema.optional(),
    })
    .strict();

export const updateCommentSchema = z
    .object({ content: z.string().trim().min(1).max(2000) })
    .strict();

export type ChapterParams = z.infer<typeof chapterParamsSchema>;
export type CommentParams = z.infer<typeof commentParamsSchema>;
export type ChapterCommentParams = z.infer<typeof chapterCommentParamsSchema>;
export type InteractionListQuery = z.infer<typeof interactionListQuerySchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
