import type { Request, Response } from "express";

import AppError from "../../errors/app-error.js";

import {
    clearRefreshTokenCookie,
    getRefreshTokenCookie,
    setRefreshTokenCookie,
} from "./auth.cookie.js";

import type {
    LoginInput,
    RegisterInput,
    VerifyEmailInput,
} from "./auth.schema.js";

import {
    loginUser,
    logoutUser,
    refreshAuthentication,
    registerUser,
} from "./auth.service.js";

import type { ClientInformation } from "./auth.types.js";

import {
    resendEmailVerification,
    verifyEmailAddress,
} from "./email-verification.service.js";

function getClientInformation(request: Request): ClientInformation {
    const userAgent = request.get("user-agent");

    const ipAddress = request.ip;

    return {
        ...(userAgent
            ? {
                  userAgent,
              }
            : {}),

        ...(ipAddress
            ? {
                  ipAddress,
              }
            : {}),
    };
}

function getAuthenticatedUserId(request: Request): string {
    const userId = request.auth?.userId;

    if (!userId) {
        throw AppError.unauthorized();
    }

    return userId;
}

export async function register(
    request: Request<Record<string, never>, unknown, RegisterInput>,
    response: Response,
): Promise<void> {
    const result = await registerUser(
        request.body,
        getClientInformation(request),
    );

    setRefreshTokenCookie(
        response,
        result.refreshToken,
        result.sessionExpiresAt,
    );

    response.status(201).json({
        data: {
            user: result.user,

            accessToken: result.accessToken,
        },
    });
}

export async function login(
    request: Request<Record<string, never>, unknown, LoginInput>,
    response: Response,
): Promise<void> {
    const result = await loginUser(request.body, getClientInformation(request));

    setRefreshTokenCookie(
        response,
        result.refreshToken,
        result.sessionExpiresAt,
    );

    response.status(200).json({
        data: {
            user: result.user,

            accessToken: result.accessToken,
        },
    });
}

export async function refresh(
    request: Request,
    response: Response,
): Promise<void> {
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
    );

    response.status(200).json({
        data: {
            user: result.user,

            accessToken: result.accessToken,
        },
    });
}

export async function logout(
    request: Request,
    response: Response,
): Promise<void> {
    const refreshToken = getRefreshTokenCookie(request);

    await logoutUser(refreshToken);

    clearRefreshTokenCookie(response);

    response.status(204).send();
}

export async function verifyEmail(
    request: Request<Record<string, never>, unknown, VerifyEmailInput>,
    response: Response,
): Promise<void> {
    await verifyEmailAddress(request.body.token);

    response.status(200).json({
        data: {
            emailVerified: true,
        },
    });
}

export async function resendVerificationEmail(
    request: Request,
    response: Response,
): Promise<void> {
    await resendEmailVerification(getAuthenticatedUserId(request));

    response.status(202).json({
        data: {
            status: "sent",
        },
    });
}
