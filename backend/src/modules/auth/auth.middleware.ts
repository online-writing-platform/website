import type { NextFunction, Request, Response } from "express";

import { prisma } from "../../db/index.js";
import AppError from "../../errors/app-error.js";

import { verifyAccessToken } from "../../security/token.js";

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

    const authContext = await verifyAccessToken(accessToken);

    const activeSession = await prisma.session.findFirst({
        where: {
            id: authContext.sessionId,

            userId: authContext.userId,

            revokedAt: null,

            expiresAt: {
                gt: new Date(),
            },

            user: {
                status: "ACTIVE",
            },
        },

        select: {
            id: true,
        },
    });

    if (!activeSession) {
        throw AppError.unauthorized(
            "The session is no longer active.",
            "INACTIVE_SESSION",
        );
    }

    request.auth = authContext;

    next();
}
