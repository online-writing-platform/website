import { randomUUID } from "node:crypto";

import type { IncomingMessage, ServerResponse } from "node:http";

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp, type Options as PinoHttpOptions } from "pino-http";

import env from "./config/env.js";
import logger from "./config/logger.js";
import AppError from "./errors/app-error.js";
import errorHandler from "./middlewares/error.middleware.js";
import notFoundHandler from "./middlewares/notFound.middleware.js";
import { generalApiRateLimiter } from "./middlewares/rate-limit.middleware.js";
import { analyticsRoutes } from "./modules/analytics/index.js";
import { authRoutes } from "./modules/auth/index.js";
import { discoveryRoutes } from "./modules/discovery/index.js";
import healthRoutes from "./modules/health/health.routes.js";
import { feedRoutes } from "./modules/discovery/index.js";
import { entitlementRoutes } from "./modules/entitlements/index.js";
import { interactionChapterRoutes, commentRoutes } from "./modules/interactions/index.js";
import {
    libraryRoutes,
    progressRoutes,
    publicUserReadingListRoutes,
    readingListRoutes,
} from "./modules/reading/index.js";
import { mediaRoutes } from "./modules/media/index.js";
import { moderationRoutes, reportRoutes } from "./modules/moderation/index.js";
import { notificationRoutes } from "./modules/notifications/index.js";
import { preferenceRoutes } from "./modules/preferences/index.js";
import { searchRoutes } from "./modules/discovery/index.js";
import { socialUserRoutes } from "./modules/social/index.js";
import { contentRoutes } from "./modules/content/index.js";
import { userRoutes } from "./modules/users/index.js";
import openApiRoutes from "./openapi/routes.js";

const app = express();

function getRequestId(headerValue: string | string[] | undefined): string {
    if (typeof headerValue === "string") {
        const requestId = headerValue.trim();
        if (requestId.length > 0) return requestId.slice(0, 128);
    }

    if (Array.isArray(headerValue)) {
        const requestId = headerValue.find((value) => value.trim().length > 0);
        if (requestId) return requestId.trim().slice(0, 128);
    }

    return randomUUID();
}

const httpLoggerOptions: PinoHttpOptions<IncomingMessage, ServerResponse> = {
    logger,
    genReqId(request, response) {
        const requestId = getRequestId(request.headers["x-request-id"]);
        response.setHeader("x-request-id", requestId);
        return requestId;
    },
    customLogLevel(_request, response, error) {
        if (error !== undefined || response.statusCode >= 500) return "error";
        if (response.statusCode >= 400) return "warn";
        return "info";
    },
};

app.disable("x-powered-by");

if (env.trustProxy) {
    app.set("trust proxy", 1);
}

app.use(pinoHttp(httpLoggerOptions));
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
);
app.use(
    cors({
        credentials: true,
        origin(origin, callback) {
            if (!origin || env.clientOrigins.includes(origin)) {
                callback(null, true);
                return;
            }
            callback(
                AppError.forbidden(
                    "This origin is not allowed to access the API.",
                    "CORS_ORIGIN_NOT_ALLOWED",
                ),
            );
        },
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
        exposedHeaders: ["X-Request-Id", "RateLimit", "RateLimit-Policy"],
    }),
);

app.use(cookieParser());
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: false, limit: "256kb" }));

app.use("/health", healthRoutes);
app.use("/api/v1", generalApiRateLimiter);
app.use("/api/v1", openApiRoutes);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/users", socialUserRoutes);
app.use("/api/v1/users", publicUserReadingListRoutes);
app.use("/api/v1/stories", contentRoutes);
app.use("/api/v1/chapters", interactionChapterRoutes);
app.use("/api/v1/comments", commentRoutes);
app.use("/api/v1/library", libraryRoutes);
app.use("/api/v1/reading-progress", progressRoutes);
app.use("/api/v1/reading-lists", readingListRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/preferences", preferenceRoutes);
app.use("/api/v1/media", mediaRoutes);
app.use("/api/v1/search", searchRoutes);
app.use("/api/v1/feed", feedRoutes);
app.use("/api/v1/entitlements", entitlementRoutes);
app.use("/api/v1/discovery", discoveryRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/moderation", moderationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
