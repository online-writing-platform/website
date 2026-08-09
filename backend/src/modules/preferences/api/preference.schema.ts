import { z } from "zod";

export const updatePreferencesSchema = z
    .object({
        allowMatureContent: z.boolean().optional(),
        readerTheme: z.enum(["SYSTEM", "LIGHT", "DARK", "SEPIA"]).optional(),
        fontScale: z.number().min(0.75).max(1.6).optional(),
        lineHeight: z.number().min(1.2).max(2.4).optional(),
        notifyFollow: z.boolean().optional(),
        notifyComment: z.boolean().optional(),
        notifyReply: z.boolean().optional(),
        notifyVote: z.boolean().optional(),
        notifyChapterPublished: z.boolean().optional(),
        notifyModeration: z.boolean().optional(),
        notifySecurity: z.boolean().optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
        message: "At least one preference must be provided.",
    });

export type UpdatePreferencesBody = z.infer<typeof updatePreferencesSchema>;
