import type { RequestHandler } from "express";
import type { ZodType } from "zod";

import AppError from "../errors/app-error.js";

function createValidationError(issues: unknown): AppError {
    return AppError.badRequest(
        "The request contains invalid data.",
        "VALIDATION_ERROR",
        issues,
    );
}

export function validateBody(schema: ZodType): RequestHandler {
    return (request, _response, next) => {
        const result = schema.safeParse(request.body);

        if (!result.success) {
            next(createValidationError(result.error.flatten()));

            return;
        }

        request.body = result.data;
        next();
    };
}

export function validateParams(schema: ZodType): RequestHandler {
    return (request, _response, next) => {
        const result = schema.safeParse(request.params);

        if (!result.success) {
            next(createValidationError(result.error.flatten()));

            return;
        }

        request.params = result.data as typeof request.params;
        next();
    };
}
