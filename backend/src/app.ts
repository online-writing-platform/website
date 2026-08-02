import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

import cors from "cors";
import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { pinoHttp, type Options as PinoHttpOptions } from "pino-http";

import env from "./config/env.js";
import logger from "./config/logger.js";
import AppError from "./errors/app-error.js";
import errorHandler from "./middlewares/error.middleware.js";
import notFoundHandler from "./middlewares/notFound.middleware.js";
import { generalApiRateLimiter } from "./middlewares/rate-limit.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import healthRoutes from "./routes/health.routes.js";
import userRoutes from "./routes/user.routes.js";

const app = express();

function getRequestId(headerValue: string | string[] | undefined): string {
    if (typeof headerValue === "string") {
        const requestId = headerValue.trim();

        if (requestId.length > 0) {
            return requestId.slice(0, 128);
        }
    }

    if (Array.isArray(headerValue)) {
        const requestId = headerValue.find((value) => value.trim().length > 0);

        if (requestId) {
            return requestId.trim().slice(0, 128);
        }
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
        if (error !== undefined || response.statusCode >= 500) {
            return "error";
        }

        if (response.statusCode >= 400) {
            return "warn";
        }

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
        crossOriginResourcePolicy: {
            policy: "cross-origin",
        },
    }),
);

app.use(
    cors({
        credentials: true,

        origin(origin, callback) {
            if (!origin) {
                callback(null, true);
                return;
            }

            if (env.clientOrigins.includes(origin)) {
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

app.use(
    express.json({
        limit: "100kb",
    }),
);

app.use(
    express.urlencoded({
        extended: false,
        limit: "100kb",
    }),
);

app.use("/health", healthRoutes);

app.use("/api/v1", generalApiRateLimiter);

app.use("/api/v1/auth", authRoutes);

app.use("/api/v1/users", userRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
