import { z } from "zod";

import { uuidSchema } from "../../shared/validation/common.schema.js";
import { usernameSchema } from "../../shared/validation/username.schema.js";
import {
    MAX_PASSWORD_LENGTH,
    MIN_PASSWORD_LENGTH,
} from "./auth.security.js";

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

const opaqueTokenSchema = z
    .string()
    .trim()
    .min(32, "Token is invalid.")
    .max(256, "Token is invalid.");

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
        identifier: z.string().trim().min(1).max(320),
        password: z.string().min(1).max(MAX_PASSWORD_LENGTH),
    })
    .strict();

const emailVerificationCodeSchema = z
    .string()
    .trim()
    .regex(/^\d{6}$/u, "Verification code must contain exactly six digits.");

export const verifyEmailSchema = z
    .object({
        email: emailSchema,
        code: emailVerificationCodeSchema,
    })
    .strict();

export const resendVerificationEmailSchema = z
    .object({ email: emailSchema })
    .strict();

export const requestPasswordResetSchema = z
    .object({
        identifier: z.string().trim().min(1).max(320),
    })
    .strict();

export const resetPasswordSchema = z
    .object({
        token: opaqueTokenSchema,
        newPassword: passwordSchema,
    })
    .strict();

export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1).max(MAX_PASSWORD_LENGTH),
        newPassword: passwordSchema,
    })
    .strict();

export const changeUsernameSchema = z
    .object({
        currentPassword: z.string().min(1).max(MAX_PASSWORD_LENGTH),
        newUsername: usernameSchema,
    })
    .strict();

export const requestEmailChangeSchema = z
    .object({
        currentPassword: z.string().min(1).max(MAX_PASSWORD_LENGTH),
        newEmail: emailSchema,
    })
    .strict();

export const confirmEmailChangeSchema = z
    .object({
        token: opaqueTokenSchema,
    })
    .strict();

export const sessionParamsSchema = z
    .object({
        sessionId: uuidSchema,
    })
    .strict();

export const deleteAccountSchema = z
    .object({
        currentPassword: z.string().min(1).max(MAX_PASSWORD_LENGTH),
    })
    .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationEmailInput = z.infer<
    typeof resendVerificationEmailSchema
>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ChangeUsernameInput = z.infer<typeof changeUsernameSchema>;
export type RequestEmailChangeInput = z.infer<typeof requestEmailChangeSchema>;
export type ConfirmEmailChangeInput = z.infer<typeof confirmEmailChangeSchema>;
export type SessionParams = z.infer<typeof sessionParamsSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
