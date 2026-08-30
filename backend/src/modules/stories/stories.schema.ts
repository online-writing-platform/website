import {
  pageLimitSchema,
  uuidSchema,
} from "../../shared/validation/common.schema.js";
import { usernameSchema } from "../../shared/validation/username.schema.js";
import { z } from "zod";

import { MAX_CHAPTER_CONTENT_LENGTH } from "./chapter-content.js";

const slugSchema = z.string().trim().min(1).max(220);

const languageSchema = z.string().trim().min(2).max(10);

const genreSlugSchema = z.string().trim().min(1).max(80);

const tagSchema = z.string().trim().min(1).max(80);

const rightsSchema = z.enum([
  "ALL_RIGHTS_RESERVED",
  "PUBLIC_DOMAIN",
  "CREATIVE_COMMONS",
]);

export const storyIdParamsSchema = z.object({ storyId: uuidSchema }).strict();

export const storySlugParamsSchema = z.object({ slug: slugSchema }).strict();

export const storyChapterParamsSchema = z
  .object({
    storyId: uuidSchema,
    chapterId: uuidSchema,
  })
  .strict();

export const publicChapterParamsSchema = z
  .object({
    slug: slugSchema,
    chapterId: uuidSchema,
  })
  .strict();

export const listStoriesQuerySchema = z
  .object({
    cursor: z.string().trim().min(16).max(1024).optional(),
    limit: pageLimitSchema,
    genre: genreSlugSchema.optional(),
    tag: genreSlugSchema.optional(),
    language: languageSchema.optional(),
    author: usernameSchema.optional(),
  })
  .strict();

export const listOwnedStoriesQuerySchema = z
  .object({
    cursor: z.string().trim().min(16).max(1024).optional(),
    limit: pageLimitSchema,
  })
  .strict();

export const createStorySchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5000).default(""),
    coverUrl: z.string().trim().url().max(2048).nullable().optional(),
    language: languageSchema.optional(),
    rights: rightsSchema.optional(),
    isMature: z.boolean().optional(),
    genreSlug: genreSlugSchema.nullable().optional(),
    tags: z.array(tagSchema).max(25).optional(),
  })
  .strict();

export const updateStorySchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().min(1).max(5000).optional(),
    coverUrl: z.string().trim().url().max(2048).nullable().optional(),
    language: languageSchema.optional(),
    rights: rightsSchema.optional(),
    isMature: z.boolean().optional(),
    genreSlug: genreSlugSchema.nullable().optional(),
    tags: z.array(tagSchema).max(25).optional(),
    status: z.enum(["ONGOING", "COMPLETED", "HIATUS"]).optional(),
    visibility: z.enum(["PRIVATE", "UNLISTED"]).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one story field must be provided.",
  });

export const createChapterSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    content: z.string().max(MAX_CHAPTER_CONTENT_LENGTH),
  })
  .strict();

export const updateChapterSchema = z
  .object({
    expectedVersion: z.number().int().min(1),
    title: z.string().trim().min(1).max(200).optional(),
    content: z.string().max(MAX_CHAPTER_CONTENT_LENGTH).optional(),
  })
  .strict()
  .refine((value) => value.title !== undefined || value.content !== undefined, {
    message: "At least one chapter field must be provided.",
  });

export const reorderChaptersSchema = z
  .object({
    chapterIds: z.array(uuidSchema).min(1).max(500),
    expectedOrderingVersion: z.number().int().min(1),
  })
  .strict();

export const schedulePublicationSchema = z
  .object({
    scheduledAt: z.coerce.date(),
  })
  .strict();

export const scheduleChapterPublicationSchema = schedulePublicationSchema
  .extend({
    expectedVersion: z.number().int().min(1),
  })
  .strict();

export type StoryIdParams = z.infer<typeof storyIdParamsSchema>;

export type StorySlugParams = z.infer<typeof storySlugParamsSchema>;

export type StoryChapterParams = z.infer<typeof storyChapterParamsSchema>;

export type PublicChapterParams = z.infer<typeof publicChapterParamsSchema>;

export type ListStoriesQuery = z.infer<typeof listStoriesQuerySchema>;

export type ListOwnedStoriesQuery = z.infer<typeof listOwnedStoriesQuerySchema>;

export type CreateStoryBody = z.infer<typeof createStorySchema>;

export type UpdateStoryBody = z.infer<typeof updateStorySchema>;

export type CreateChapterBody = z.infer<typeof createChapterSchema>;

export type UpdateChapterBody = z.infer<typeof updateChapterSchema>;

export type ReorderChaptersBody = z.infer<typeof reorderChaptersSchema>;

export type SchedulePublicationBody = z.infer<typeof schedulePublicationSchema>;

export type ScheduleChapterPublicationBody = z.infer<
  typeof scheduleChapterPublicationSchema
>;

export const revisionParamsSchema = z
  .object({
    storyId: uuidSchema,
    chapterId: uuidSchema,
    revisionId: uuidSchema,
  })
  .strict();

export const chapterRevisionParamsSchema = revisionParamsSchema.omit({
  revisionId: true,
});

export const revisionListQuerySchema = z
  .object({
    cursor: z.coerce.number().int().min(1).optional(),
    limit: pageLimitSchema,
  })
  .strict();

export const restoreRevisionSchema = z
  .object({ expectedVersion: z.number().int().min(1) })
  .strict();

export type RevisionParams = z.infer<typeof revisionParamsSchema>;

export type ChapterRevisionParams = z.infer<typeof chapterRevisionParamsSchema>;

export type RevisionListQuery = z.infer<typeof revisionListQuerySchema>;

export type RestoreRevisionBody = z.infer<typeof restoreRevisionSchema>;
