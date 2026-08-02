import type { NextFunction, Request, Response } from "express";

import AppError from "../errors/app-error.js";

export default function notFoundHandler(
    request: Request,
    _response: Response,
    next: NextFunction,
): void {
    next(
        AppError.notFound(
            `Route ${request.method} ${request.originalUrl} was not found.`,
            "ROUTE_NOT_FOUND",
        ),
    );
}
