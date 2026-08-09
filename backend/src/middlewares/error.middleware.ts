import type { NextFunction, Request, Response } from "express";
import multer from "multer";

import env from "../config/env.js";
import logger from "../config/logger.js";
import AppError from "../errors/app-error.js";

interface ErrorResponse {
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
}

function isMalformedJsonError(error: unknown): error is SyntaxError {
    return (
        error instanceof SyntaxError &&
        typeof error === "object" &&
        error !== null &&
        "body" in error
    );
}

function normalizeError(error: unknown): AppError {
    if (error instanceof AppError) return error;

    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            return new AppError(413, "Uploaded image is too large.", {
                code: "UPLOAD_TOO_LARGE",
            });
        }

        return AppError.badRequest(
            "The uploaded file could not be processed.",
            "INVALID_MULTIPART_UPLOAD",
        );
    }

    if (isMalformedJsonError(error)) {
        return AppError.badRequest(
            "The request body contains malformed JSON.",
            "MALFORMED_JSON",
        );
    }

    return new AppError(500, "Internal Server Error", {
        code: "INTERNAL_SERVER_ERROR",
        cause: error,
    });
}

export default function errorHandler(
    error: unknown,
    request: Request,
    response: Response,
    next: NextFunction,
): void {
    if (response.headersSent) {
        next(error);
        return;
    }

    const normalizedError = normalizeError(error);

    if (normalizedError.statusCode >= 500) {
        logger.error(
            {
                error,
                requestId: request.get("x-request-id"),
                method: request.method,
                path: request.originalUrl,
            },
            "Unhandled request error",
        );
    } else {
        logger.warn(
            {
                code: normalizedError.code,
                requestId: request.get("x-request-id"),
                method: request.method,
                path: request.originalUrl,
            },
            normalizedError.message,
        );
    }

    const responseBody: ErrorResponse = {
        error: {
            code: normalizedError.code,
            message:
                normalizedError.statusCode >= 500 && env.isProduction
                    ? "Internal Server Error"
                    : normalizedError.message,
        },
    };

    if (
        normalizedError.details !== undefined &&
        normalizedError.statusCode < 500
    ) {
        responseBody.error.details = normalizedError.details;
    }

    response.status(normalizedError.statusCode).json(responseBody);
}
