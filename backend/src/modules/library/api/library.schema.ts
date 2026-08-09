import { z } from "zod";

import { paginationQuerySchema, uuidSchema } from "../../../shared/validation/common.schema.js";
import { usernameSchema } from "../../../shared/validation/username.schema.js";

export const storyIdParamsSchema = z.object({ storyId: uuidSchema });
export const readingListParamsSchema = z.object({ listId: uuidSchema });
export const readingListItemParamsSchema = z.object({ listId: uuidSchema, storyId: uuidSchema });
export const publicReadingListsParamsSchema = z.object({ username: usernameSchema });
export const libraryListQuerySchema = paginationQuerySchema;

export const progressSchema = z
    .object({
        storyId: uuidSchema,
        chapterId: uuidSchema.optional(),
        progress: z.number().min(0).max(1),
    })
    .strict();

export const createReadingListSchema = z
    .object({
        name: z.string().trim().min(1).max(100),
        description: z.string().trim().max(500).optional(),
        isPublic: z.boolean().default(true),
    })
    .strict();

export const updateReadingListSchema = z
    .object({
        name: z.string().trim().min(1).max(100).optional(),
        description: z.string().trim().max(500).nullable().optional(),
        isPublic: z.boolean().optional(),
    })
    .strict()
    .refine((input) => Object.keys(input).length > 0, { message: "At least one field is required." });

export const addReadingListItemSchema = z.object({ storyId: uuidSchema }).strict();

export type StoryIdParams = z.infer<typeof storyIdParamsSchema>;
export type ReadingListParams = z.infer<typeof readingListParamsSchema>;
export type ReadingListItemParams = z.infer<typeof readingListItemParamsSchema>;
export type PublicReadingListsParams = z.infer<typeof publicReadingListsParamsSchema>;
export type LibraryListQuery = z.infer<typeof libraryListQuerySchema>;
export type ProgressInput = z.infer<typeof progressSchema>;
export type CreateReadingListInput = z.infer<typeof createReadingListSchema>;
export type UpdateReadingListInput = z.infer<typeof updateReadingListSchema>;
export type AddReadingListItemInput = z.infer<typeof addReadingListItemSchema>;
