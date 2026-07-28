import type { NextFunction, Request, Response } from "express";

export default function errorHandler(
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void {
    console.error(error);

    let statusCode = 500;
    let message = "Internal Server Error";

    if (error instanceof Error) {
        message = error.message || message;

        if ("statusCode" in error && typeof error.statusCode === "number") {
            statusCode = error.statusCode;
        }
    }

    res.status(statusCode).json({
        message,
    });
}
