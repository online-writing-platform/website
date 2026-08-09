import type { NextFunction, Request, Response } from "express";

import AppError from "../../../errors/app-error.js";

import { authModule } from "../auth.module.js";
import type { UserRoleValue } from "../domain/auth.types.js";

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

export async function optionalAuthenticate(
    request: Request,
    _response: Response,
    next: NextFunction,
): Promise<void> {
    const authorization = request.get("authorization");

    if (!authorization) {
        next();
        return;
    }

    try {
        const accessToken = extractBearerToken(authorization);
        request.auth = await authModule.authenticateSession.execute(accessToken);
        next();
    } catch {
        next(
            AppError.unauthorized(
                "The access token is invalid or expired.",
                "INVALID_ACCESS_TOKEN",
            ),
        );
    }
}

export function requireVerifiedEmail(
    request: Request,
    _response: Response,
    next: NextFunction,
): void {
    if (!request.auth) {
        next(AppError.unauthorized());
        return;
    }

    if (!request.auth.emailVerified) {
        next(
            AppError.forbidden(
                "Email verification is required for this action.",
                "EMAIL_VERIFICATION_REQUIRED",
            ),
        );
        return;
    }

    next();
}

export function requireRole(...roles: UserRoleValue[]) {
    return (request: Request, _response: Response, next: NextFunction): void => {
        if (!request.auth) {
            next(AppError.unauthorized());
            return;
        }

        if (!roles.includes(request.auth.role)) {
            next(
                AppError.forbidden(
                    "You do not have permission to perform this action.",
                    "INSUFFICIENT_ROLE",
                ),
            );
            return;
        }

        next();
    };
}
