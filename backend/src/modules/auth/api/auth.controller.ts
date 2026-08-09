import type { Request, Response } from "express";

import AppError from "../../../errors/app-error.js";

import { authModule } from "../auth.module.js";

import {
    clearRefreshTokenCookie,
    getRefreshTokenCookie,
    setRefreshTokenCookie,
} from "./auth.cookie.js";

import type {
    LoginInput,
    RegisterInput,
    RequestPasswordResetInput,
    ResetPasswordInput,
    VerifyEmailInput,
} from "./auth.schema.js";

import type { ClientInformation } from "../domain/auth.types.js";

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

function requireUserId(request: Request): string {
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
    const result = await authModule.registerUser.execute(
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
    const result = await authModule.loginUser.execute(
        request.body,
        getClientInformation(request),
    );

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

    const result = await authModule.refreshSession.execute(refreshToken);

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
    await authModule.logoutUser.execute(getRefreshTokenCookie(request));

    clearRefreshTokenCookie(response);

    response.status(204).send();
}

export async function verifyEmail(
    request: Request<Record<string, never>, unknown, VerifyEmailInput>,
    response: Response,
): Promise<void> {
    await authModule.emailVerification.verify(request.body.token);

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
    await authModule.emailVerification.resend(requireUserId(request));

    response.status(202).json({
        data: {
            status: "sent",
        },
    });
}

export async function requestPasswordReset(
    request: Request<Record<string, never>, unknown, RequestPasswordResetInput>,
    response: Response,
): Promise<void> {
    await authModule.requestPasswordReset.execute(request.body.identifier);

    response.status(202).json({
        data: {
            status: "accepted",
        },
    });
}

export async function resetPassword(
    request: Request<Record<string, never>, unknown, ResetPasswordInput>,
    response: Response,
): Promise<void> {
    await authModule.resetPassword.execute(
        request.body.token,
        request.body.newPassword,
    );

    clearRefreshTokenCookie(response);

    response.status(204).send();
}
