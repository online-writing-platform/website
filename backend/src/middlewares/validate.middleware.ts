import type { Request, RequestHandler } from "express";
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

export function validateQuery(schema: ZodType): RequestHandler {
    return (request, _response, next) => {
        const result = schema.safeParse(request.query);

        if (!result.success) {
            next(createValidationError(result.error.flatten()));
            return;
        }

        request.validatedQuery = result.data;
        next();
    };
}

export function getValidatedQuery<T>(request: Request): T {
    if (request.validatedQuery === undefined) {
        throw new Error(
            "Validated query data is unavailable. Ensure validateQuery() runs before the controller.",
        );
    }

    return request.validatedQuery as T;
}
