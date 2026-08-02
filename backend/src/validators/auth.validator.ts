import { z } from "zod";

const usernameSchema = z
    .string()
    .trim()
    .min(3, "Username must contain at least 3 characters.")
    .max(30, "Username cannot contain more than 30 characters.")
    .toLowerCase()
    .regex(
        /^[a-z0-9_]+$/,
        "Username can only contain lowercase letters, numbers, and underscores.",
    );

const emailSchema = z
    .string()
    .trim()
    .toLowerCase()
    .email("Email address is invalid.")
    .max(320, "Email address is too long.");

const passwordSchema = z
    .string()
    .min(10, "Password must contain at least 10 characters.")
    .max(128, "Password cannot contain more than 128 characters.");

export const registerSchema = z
    .object({
        email: emailSchema,
        username: usernameSchema,

        displayName: z
            .string()
            .trim()
            .min(1, "Display name is required.")
            .max(80, "Display name cannot contain more than 80 characters."),

        password: passwordSchema,

        acceptTerms: z.literal(true, {
            error: "You must accept the terms before registering.",
        }),
    })
    .strict();

export const loginSchema = z
    .object({
        identifier: z
            .string()
            .trim()
            .min(1, "Email or username is required.")
            .max(320)
            .toLowerCase(),

        password: z.string().min(1, "Password is required.").max(128),

        rememberMe: z.boolean().default(false),
    })
    .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
