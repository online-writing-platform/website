import type { NextFunction, Request, Response } from "express";

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

    let normalizedError: AppError;

    if (error instanceof AppError) {
        normalizedError = error;
    } else if (isMalformedJsonError(error)) {
        normalizedError = AppError.badRequest(
            "The request body contains malformed JSON.",
            "MALFORMED_JSON",
        );
    } else {
        normalizedError = new AppError(500, "Internal Server Error", {
            code: "INTERNAL_SERVER_ERROR",
            cause: error,
        });
    }

    if (normalizedError.statusCode >= 500) {
        logger.error(
            {
                error,
                method: request.method,
                path: request.originalUrl,
            },
            "Unhandled request error",
        );
    } else {
        logger.warn(
            {
                code: normalizedError.code,
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
