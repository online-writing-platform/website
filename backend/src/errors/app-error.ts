interface AppErrorOptions {
    code?: string;
    details?: unknown;
    cause?: unknown;
}

export default class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly details?: unknown;
    public readonly isOperational: boolean;

    public constructor(
        statusCode: number,
        message: string,
        options: AppErrorOptions = {},
    ) {
        super(message, {
            cause: options.cause,
        });

        this.name = "AppError";

        this.statusCode = statusCode;

        this.code = options.code ?? "APPLICATION_ERROR";

        this.details = options.details;

        this.isOperational = true;

        Error.captureStackTrace(this, AppError);
    }

    public static badRequest(
        message: string,
        code = "BAD_REQUEST",
        details?: unknown,
    ): AppError {
        return new AppError(400, message, {
            code,
            details,
        });
    }

    public static unauthorized(
        message = "Authentication is required.",
        code = "UNAUTHORIZED",
    ): AppError {
        return new AppError(401, message, {
            code,
        });
    }

    public static validation(
        message = "The request contains invalid data.",
        code = "VALIDATION_ERROR",
        details?: unknown,
    ): AppError {
        return new AppError(422, message, { code, details });
    }

    public static domainRule(
        message: string,
        code = "DOMAIN_RULE_VIOLATION",
        details?: unknown,
    ): AppError {
        return new AppError(422, message, { code, details });
    }

    public static forbidden(
        message = "You do not have permission to perform this action.",
        code = "FORBIDDEN",
    ): AppError {
        return new AppError(403, message, {
            code,
        });
    }

    public static notFound(
        message = "The requested resource was not found.",
        code = "NOT_FOUND",
    ): AppError {
        return new AppError(404, message, {
            code,
        });
    }

    public static conflict(
        message: string,
        code = "CONFLICT",
        details?: unknown,
    ): AppError {
        return new AppError(409, message, {
            code,
            details,
        });
    }

    public static tooManyRequests(
        message = "Too many requests.",
        code = "TOO_MANY_REQUESTS",
        details?: unknown,
    ): AppError {
        return new AppError(429, message, {
            code,
            details,
        });
    }

    public static tooLarge(
        message = "The request payload is too large.",
        code = "PAYLOAD_TOO_LARGE",
        details?: unknown,
    ): AppError {
        return new AppError(413, message, { code, details });
    }

    public static serviceUnavailable(
        message = "The service is temporarily unavailable.",
        code = "SERVICE_UNAVAILABLE",
        cause?: unknown,
    ): AppError {
        return new AppError(503, message, {
            code,
            cause,
        });
    }
}
