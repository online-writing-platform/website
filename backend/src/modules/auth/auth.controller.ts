import type { NextFunction, Request, Response } from "express";

import {
    loginUser,
    logoutUser,
    refreshAuthentication,
    registerUser,
} from "../services/auth.service.js";
import type { ClientInformation } from "../types/auth.js";
import {
    clearRefreshTokenCookie,
    getRefreshTokenCookie,
    setRefreshTokenCookie,
} from "../utils/cookie.js";
import type {
    LoginInput,
    RegisterInput,
} from "../validators/auth.validator.js";
import AppError from "../errors/app-error.js";

function getClientInformation(request: Request): ClientInformation {
    const userAgent = request.get("user-agent");
    const ipAddress = request.ip;

    return {
        ...(userAgent ? { userAgent } : {}),
        ...(ipAddress ? { ipAddress } : {}),
    };
}

export async function register(
    request: Request<Record<string, never>, unknown, RegisterInput>,
    response: Response,
    next: NextFunction,
): Promise<void> {
    try {
        const result = await registerUser(
            request.body,
            getClientInformation(request),
        );

        setRefreshTokenCookie(
            response,
            result.refreshToken,
            result.sessionExpiresAt,
            result.isPersistent,
        );

        response.status(201).json({
            data: {
                user: result.user,
                accessToken: result.accessToken,
            },
        });
    } catch (error) {
        next(error);
    }
}

export async function login(
    request: Request<Record<string, never>, unknown, LoginInput>,
    response: Response,
    next: NextFunction,
): Promise<void> {
    try {
        const result = await loginUser(
            request.body,
            getClientInformation(request),
        );

        setRefreshTokenCookie(
            response,
            result.refreshToken,
            result.sessionExpiresAt,
            result.isPersistent,
        );

        response.status(200).json({
            data: {
                user: result.user,
                accessToken: result.accessToken,
            },
        });
    } catch (error) {
        next(error);
    }
}

export async function refresh(
    request: Request,
    response: Response,
    next: NextFunction,
): Promise<void> {
    try {
        const refreshToken = getRefreshTokenCookie(request);

        if (!refreshToken) {
            throw AppError.unauthorized(
                "A refresh token is required.",
                "REFRESH_TOKEN_REQUIRED",
            );
        }

        const result = await refreshAuthentication(refreshToken);

        setRefreshTokenCookie(
            response,
            result.refreshToken,
            result.sessionExpiresAt,
            result.isPersistent,
        );

        response.status(200).json({
            data: {
                user: result.user,
                accessToken: result.accessToken,
            },
        });
    } catch (error) {
        next(error);
    }
}

export async function logout(
    request: Request,
    response: Response,
    next: NextFunction,
): Promise<void> {
    try {
        const refreshToken = getRefreshTokenCookie(request);

        await logoutUser(refreshToken);

        clearRefreshTokenCookie(response);

        response.status(204).send();
    } catch (error) {
        next(error);
    }
}
