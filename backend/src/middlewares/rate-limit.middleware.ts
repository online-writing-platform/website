import { rateLimit } from "express-rate-limit";

export const generalApiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,

    limit: 300,

    standardHeaders: "draft-8",

    legacyHeaders: false,

    message: {
        error: {
            code: "RATE_LIMIT_EXCEEDED",

            message: "Too many requests. Please try again later.",
        },
    },
});

export const registrationRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,

    limit: 5,

    standardHeaders: "draft-8",

    legacyHeaders: false,

    message: {
        error: {
            code: "REGISTRATION_RATE_LIMIT_EXCEEDED",

            message: "Too many registration attempts. Please try again later.",
        },
    },
});

export const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,

    limit: 15,

    standardHeaders: "draft-8",

    legacyHeaders: false,

    skipSuccessfulRequests: true,

    message: {
        error: {
            code: "LOGIN_RATE_LIMIT_EXCEEDED",

            message: "Too many login attempts. Please try again later.",
        },
    },
});

export const refreshRateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,

    limit: 60,

    standardHeaders: "draft-8",

    legacyHeaders: false,

    message: {
        error: {
            code: "REFRESH_RATE_LIMIT_EXCEEDED",

            message: "Too many token refresh requests. Please try again later.",
        },
    },
});

export const emailVerificationRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,

    limit: 30,

    standardHeaders: "draft-8",

    legacyHeaders: false,

    message: {
        error: {
            code: "EMAIL_VERIFICATION_RATE_LIMIT_EXCEEDED",

            message:
                "Too many email verification attempts. Please try again later.",
        },
    },
});

export const verificationEmailResendRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,

    limit: 5,

    standardHeaders: "draft-8",

    legacyHeaders: false,

    message: {
        error: {
            code: "VERIFICATION_EMAIL_RESEND_RATE_LIMIT_EXCEEDED",

            message:
                "Too many verification email requests. Please try again later.",
        },
    },
});

export const passwordResetRequestRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,

    limit: 5,

    standardHeaders: "draft-8",

    legacyHeaders: false,

    message: {
        error: {
            code: "PASSWORD_RESET_REQUEST_RATE_LIMIT_EXCEEDED",

            message:
                "Too many password reset requests. Please try again later.",
        },
    },
});

export const passwordResetConfirmRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,

    limit: 20,

    standardHeaders: "draft-8",

    legacyHeaders: false,

    message: {
        error: {
            code: "PASSWORD_RESET_CONFIRM_RATE_LIMIT_EXCEEDED",

            message:
                "Too many password reset attempts. Please try again later.",
        },
    },
});
