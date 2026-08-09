import { z } from "zod";

import { paginationQuerySchema, uuidSchema } from "../../../shared/validation/common.schema.js";

const targetTypeSchema = z.enum(["USER", "STORY", "CHAPTER", "COMMENT"]);
const reasonSchema = z.enum([
    "SPAM",
    "HARASSMENT",
    "HATE_OR_ABUSE",
    "SEXUAL_CONTENT",
    "VIOLENCE",
    "COPYRIGHT",
    "IMPERSONATION",
    "OTHER",
]);
const reportStatusSchema = z.enum(["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"]);
const actionSchema = z.enum([
    "SUSPEND_USER",
    "RESTORE_USER",
    "HIDE_STORY",
    "RESTORE_STORY",
    "HIDE_CHAPTER",
    "RESTORE_CHAPTER",
    "HIDE_COMMENT",
    "RESTORE_COMMENT",
]);

export const createReportSchema = z
    .object({
        targetType: targetTypeSchema,
        targetId: uuidSchema,
        reason: reasonSchema,
        details: z.string().trim().max(2000).optional(),
    })
    .strict();

export const reportListQuerySchema = paginationQuerySchema.extend({
    status: reportStatusSchema.optional(),
    targetType: targetTypeSchema.optional(),
});

export const reportParamsSchema = z.object({ reportId: uuidSchema });
export const moderationTargetParamsSchema = z.object({ targetType: targetTypeSchema, targetId: uuidSchema });

export const updateReportSchema = z
    .object({
        status: reportStatusSchema.optional(),
        resolution: z.string().trim().max(2000).nullable().optional(),
        assignToSelf: z.boolean().optional(),
    })
    .strict()
    .refine((input) => Object.keys(input).length > 0, { message: "At least one field is required." });

export const moderationActionSchema = z
    .object({ action: actionSchema, reason: z.string().trim().max(2000).optional() })
    .strict();

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ReportListQuery = z.infer<typeof reportListQuerySchema>;
export type ReportParams = z.infer<typeof reportParamsSchema>;
export type ModerationTargetParams = z.infer<typeof moderationTargetParamsSchema>;
export type UpdateReportInput = z.infer<typeof updateReportSchema>;
export type ModerationActionInput = z.infer<typeof moderationActionSchema>;
