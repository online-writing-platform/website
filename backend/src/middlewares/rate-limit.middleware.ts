import { rateLimit } from "express-rate-limit";

function rateLimitMessage(code: string, message: string): { error: { code: string; message: string } } {
    return {
        error: {
            code,
            message,
        },
    };
}

export const generalApiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: rateLimitMessage(
        "RATE_LIMIT_EXCEEDED",
        "Too many requests. Please try again later.",
    ),
});

export const registrationRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: rateLimitMessage(
        "REGISTRATION_RATE_LIMIT_EXCEEDED",
        "Too many registration attempts. Please try again later.",
    ),
});

export const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 15,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: rateLimitMessage(
        "LOGIN_RATE_LIMIT_EXCEEDED",
        "Too many login attempts. Please try again later.",
    ),
});

export const refreshRateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 60,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: rateLimitMessage(
        "REFRESH_RATE_LIMIT_EXCEEDED",
        "Too many token refresh requests. Please try again later.",
    ),
});

export const emailVerificationRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: rateLimitMessage(
        "EMAIL_VERIFICATION_RATE_LIMIT_EXCEEDED",
        "Too many email verification attempts. Please try again later.",
    ),
});

export const verificationEmailResendRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: rateLimitMessage(
        "VERIFICATION_EMAIL_RESEND_RATE_LIMIT_EXCEEDED",
        "Too many verification email requests. Please try again later.",
    ),
});

export const passwordResetRequestRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: rateLimitMessage(
        "PASSWORD_RESET_REQUEST_RATE_LIMIT_EXCEEDED",
        "Too many password reset requests. Please try again later.",
    ),
});

export const passwordResetConfirmRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: rateLimitMessage(
        "PASSWORD_RESET_CONFIRM_RATE_LIMIT_EXCEEDED",
        "Too many password reset attempts. Please try again later.",
    ),
});

export const sensitiveAccountRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: rateLimitMessage(
        "SENSITIVE_ACCOUNT_RATE_LIMIT_EXCEEDED",
        "Too many account security requests. Please try again later.",
    ),
});

export const contentWriteRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: rateLimitMessage(
        "CONTENT_WRITE_RATE_LIMIT_EXCEEDED",
        "Too many content changes. Please try again later.",
    ),
});

export const socialWriteRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: rateLimitMessage(
        "SOCIAL_WRITE_RATE_LIMIT_EXCEEDED",
        "Too many social actions. Please try again later.",
    ),
});

export const reportRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: rateLimitMessage(
        "REPORT_RATE_LIMIT_EXCEEDED",
        "Too many reports. Please try again later.",
    ),
});

export const moderationRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: rateLimitMessage(
        "MODERATION_RATE_LIMIT_EXCEEDED",
        "Too many moderation actions. Please try again later.",
    ),
});
