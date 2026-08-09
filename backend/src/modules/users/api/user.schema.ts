import { z } from "zod";

import { usernameSchema } from "../../../shared/validation/username.schema.js";

export const usernameParamsSchema = z
    .object({
        username: usernameSchema,
    })
    .strict();

export const updateProfileSchema = z
    .object({
        displayName: z
            .string()
            .trim()
            .min(1, "Display name cannot be empty.")
            .max(80, "Display name cannot contain more than 80 characters.")
            .optional(),
        bio: z
            .string()
            .trim()
            .max(500, "Bio cannot contain more than 500 characters.")
            .nullable()
            .optional(),
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
