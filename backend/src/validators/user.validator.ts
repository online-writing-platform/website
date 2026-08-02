import { z } from "zod";

const usernameSchema = z
    .string()
    .trim()
    .min(3)
    .max(30)
    .toLowerCase()
    .regex(/^[a-z0-9_]+$/);

export const usernameParamsSchema = z.object({
    username: usernameSchema,
});

export const updateProfileSchema = z
    .object({
        username: usernameSchema.optional(),

        displayName: z.string().trim().min(1).max(80).optional(),

        bio: z.string().trim().max(500).nullable().optional(),

        avatarUrl: z
            .string()
            .trim()
            .url("Avatar URL must be a valid URL.")
            .max(2048)
            .nullable()
            .optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
        message: "At least one profile field must be provided.",
    });

export type UsernameParams = z.infer<typeof usernameParamsSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
