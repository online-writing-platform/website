import { z } from "zod";

import { usernameSchema } from "../../../shared/validation/username.schema.js";

import {
    MAX_PASSWORD_LENGTH,
    MIN_PASSWORD_LENGTH,
} from "../domain/password-policy.js";

const emailSchema = z
    .string()
    .trim()
    .toLowerCase()
    .email("Email address is invalid.")
    .max(320, "Email address is too long.");

const passwordSchema = z
    .string()
    .min(
        MIN_PASSWORD_LENGTH,
        `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`,
    )
    .max(
        MAX_PASSWORD_LENGTH,
        `Password cannot contain more than ${MAX_PASSWORD_LENGTH} characters.`,
    );

const birthDateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Birth date must use YYYY-MM-DD format.");

const emailVerificationTokenSchema = z
    .string()
    .trim()
    .min(32, "Verification token is invalid.")
    .max(256, "Verification token is invalid.");

export const registerSchema = z
    .object({
        username: usernameSchema,

        email: emailSchema,

        password: passwordSchema,

        birthDate: birthDateSchema,

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
            .max(320),

        password: z
            .string()
            .min(1, "Password is required.")
            .max(MAX_PASSWORD_LENGTH),
    })
    .strict();

export const verifyEmailSchema = z
    .object({
        token: emailVerificationTokenSchema,
    })
    .strict();

export type RegisterInput = z.infer<typeof registerSchema>;

export type LoginInput = z.infer<typeof loginSchema>;

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
