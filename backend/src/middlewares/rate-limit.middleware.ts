import { rateLimit, type Options } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";

import env from "../config/env.js";
import { getRedisClient } from "../infrastructure/redis/redis.js";

interface LimitPolicy {
    name: string;
    windowMs: number;
    limit: number;
    code: string;
    message: string;
    skipSuccessfulRequests?: boolean;
}

function createLimiter(policy: LimitPolicy) {
    const redis = getRedisClient();
    const options: Partial<Options> = {
        windowMs: policy.windowMs,
        limit: policy.limit,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        passOnStoreError: false,
        skipSuccessfulRequests: policy.skipSuccessfulRequests ?? false,
        message: {
            error: {
                code: policy.code,
                message: policy.message,
                requestId: "rate-limited",
            },
        },
    };

    if (redis) {
        options.store = new RedisStore({
            prefix: `writing-platform:rate:${policy.name}:`,
            sendCommand: (...args: string[]) => redis.sendCommand(args),
        });
    } else if (env.isProduction) {
        throw new Error(`Redis is required for production rate limiter ${policy.name}.`);
    }

    return rateLimit(options);
}

function policy(
    name: string,
    windowMs: number,
    limit: number,
    code: string,
    message: string,
    skipSuccessfulRequests = false,
) {
    return createLimiter({ name, windowMs, limit, code, message, skipSuccessfulRequests });
}

export const generalApiRateLimiter = policy("api", 15 * 60_000, 600, "RATE_LIMIT_EXCEEDED", "Too many requests. Please try again later.");
export const registrationRateLimiter = policy("register", 60 * 60_000, 5, "REGISTRATION_RATE_LIMIT_EXCEEDED", "Too many registration attempts. Please try again later.");
export const loginRateLimiter = policy("login", 15 * 60_000, 15, "LOGIN_RATE_LIMIT_EXCEEDED", "Too many login attempts. Please try again later.", true);
export const refreshRateLimiter = policy("refresh", 5 * 60_000, 60, "REFRESH_RATE_LIMIT_EXCEEDED", "Too many token refresh requests. Please try again later.");
export const emailVerificationRateLimiter = policy("verify-email", 15 * 60_000, 30, "EMAIL_VERIFICATION_RATE_LIMIT_EXCEEDED", "Too many email verification attempts. Please try again later.");
export const verificationEmailResendRateLimiter = policy("resend-verification", 60 * 60_000, 5, "VERIFICATION_EMAIL_RESEND_RATE_LIMIT_EXCEEDED", "Too many verification email requests. Please try again later.");
export const passwordResetRequestRateLimiter = policy("request-reset", 15 * 60_000, 5, "PASSWORD_RESET_REQUEST_RATE_LIMIT_EXCEEDED", "Too many password reset requests. Please try again later.");
export const passwordResetConfirmRateLimiter = policy("confirm-reset", 15 * 60_000, 20, "PASSWORD_RESET_CONFIRM_RATE_LIMIT_EXCEEDED", "Too many password reset attempts. Please try again later.");
export const sensitiveAccountRateLimiter = policy("account", 15 * 60_000, 10, "SENSITIVE_ACCOUNT_RATE_LIMIT_EXCEEDED", "Too many account security requests. Please try again later.");
export const contentWriteRateLimiter = policy("content-write", 15 * 60_000, 120, "CONTENT_WRITE_RATE_LIMIT_EXCEEDED", "Too many content changes. Please try again later.");
export const socialWriteRateLimiter = policy("social-write", 15 * 60_000, 120, "SOCIAL_WRITE_RATE_LIMIT_EXCEEDED", "Too many social actions. Please try again later.");
export const searchRateLimiter = policy("search", 60_000, 60, "SEARCH_RATE_LIMIT_EXCEEDED", "Too many searches. Please try again shortly.");
export const uploadRateLimiter = policy("upload", 60 * 60_000, 30, "UPLOAD_RATE_LIMIT_EXCEEDED", "Too many uploads. Please try again later.");
export const reportRateLimiter = policy("report", 60 * 60_000, 10, "REPORT_RATE_LIMIT_EXCEEDED", "Too many reports. Please try again later.");
export const moderationRateLimiter = policy("moderation", 15 * 60_000, 120, "MODERATION_RATE_LIMIT_EXCEEDED", "Too many moderation actions. Please try again later.");
