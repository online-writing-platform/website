import type { NextFunction, Request, Response } from "express";

import AppError from "../../../errors/app-error.js";

import { authModule } from "../auth.module.js";

function extractBearerToken(authorizationHeader: string | undefined): string {
    if (!authorizationHeader) {
        throw AppError.unauthorized(
            "An access token is required.",
            "ACCESS_TOKEN_REQUIRED",
        );
    }

    const [scheme, token, ...remainingParts] = authorizationHeader.split(" ");

    if (
        scheme?.toLowerCase() !== "bearer" ||
        !token ||
        remainingParts.length > 0
    ) {
        throw AppError.unauthorized(
            "The Authorization header is invalid.",
            "INVALID_AUTHORIZATION_HEADER",
        );
    }

    return token;
}

export async function authenticate(
    request: Request,
    _response: Response,
    next: NextFunction,
): Promise<void> {
    const accessToken = extractBearerToken(request.get("authorization"));

    request.auth = await authModule.authenticateSession.execute(accessToken);

    next();
}
