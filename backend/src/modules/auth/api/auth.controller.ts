import type { Request, Response } from "express";

import AppError from "../../../errors/app-error.js";

import { authModule } from "../auth.module.js";
import type { ClientInformation } from "../domain/auth.types.js";

import {
    clearRefreshTokenCookie,
    getRefreshTokenCookie,
    setRefreshTokenCookie,
} from "./auth.cookie.js";

import type {
    ChangePasswordInput,
    ChangeUsernameInput,
    ConfirmEmailChangeInput,
    DeleteAccountInput,
    LoginInput,
    RegisterInput,
    RequestEmailChangeInput,
    RequestPasswordResetInput,
    ResetPasswordInput,
    SessionParams,
    VerifyEmailInput,
} from "./auth.schema.js";

function getClientInformation(request: Request): ClientInformation {
    const userAgent = request.get("user-agent");
    const ipAddress = request.ip;

    return {
        ...(userAgent ? { userAgent } : {}),
        ...(ipAddress ? { ipAddress } : {}),
    };
}

function requireAuth(request: Request) {
    if (!request.auth) {
        throw AppError.unauthorized();
    }

    return request.auth;
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
        data: { emailVerified: true },
    });
}

export async function resendVerificationEmail(
    request: Request,
    response: Response,
): Promise<void> {
    await authModule.emailVerification.resend(requireAuth(request).userId);

    response.status(202).json({
        data: { status: "sent" },
    });
}

export async function requestPasswordReset(
    request: Request<Record<string, never>, unknown, RequestPasswordResetInput>,
    response: Response,
): Promise<void> {
    await authModule.requestPasswordReset.execute(request.body.identifier);

    response.status(202).json({
        data: { status: "accepted" },
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

export async function changePassword(
    request: Request<Record<string, never>, unknown, ChangePasswordInput>,
    response: Response,
): Promise<void> {
    const auth = requireAuth(request);

    await authModule.changePassword.execute(
        auth.userId,
        auth.sessionId,
        request.body.currentPassword,
        request.body.newPassword,
    );

    response.status(204).send();
}

export async function changeUsername(
    request: Request<Record<string, never>, unknown, ChangeUsernameInput>,
    response: Response,
): Promise<void> {
    const auth = requireAuth(request);

    await authModule.changeUsername.execute(
        auth.userId,
        request.body.currentPassword,
        request.body.newUsername,
    );

    response.status(204).send();
}

export async function requestEmailChange(
    request: Request<Record<string, never>, unknown, RequestEmailChangeInput>,
    response: Response,
): Promise<void> {
    const auth = requireAuth(request);

    await authModule.requestEmailChange.execute(
        auth.userId,
        request.body.currentPassword,
        request.body.newEmail,
    );

    response.status(202).json({
        data: { status: "sent" },
    });
}

export async function confirmEmailChange(
    request: Request<Record<string, never>, unknown, ConfirmEmailChangeInput>,
    response: Response,
): Promise<void> {
    await authModule.confirmEmailChange.execute(request.body.token);

    clearRefreshTokenCookie(response);
    response.status(204).send();
}

export async function listSessions(
    request: Request,
    response: Response,
): Promise<void> {
    const auth = requireAuth(request);
    const sessions = await authModule.listSessions.execute(
        auth.userId,
        auth.sessionId,
    );

    response.status(200).json({
        data: { sessions },
    });
}

export async function revokeSession(
    request: Request<SessionParams>,
    response: Response,
): Promise<void> {
    const auth = requireAuth(request);

    await authModule.revokeSession.execute(auth.userId, request.params.sessionId);

    if (request.params.sessionId === auth.sessionId) {
        clearRefreshTokenCookie(response);
    }

    response.status(204).send();
}

export async function revokeOtherSessions(
    request: Request,
    response: Response,
): Promise<void> {
    const auth = requireAuth(request);
    const revokedCount = await authModule.revokeOtherSessions.execute(
        auth.userId,
        auth.sessionId,
    );

    response.status(200).json({
        data: { revokedCount },
    });
}

export async function deleteAccount(
    request: Request<Record<string, never>, unknown, DeleteAccountInput>,
    response: Response,
): Promise<void> {
    const auth = requireAuth(request);

    await authModule.deleteAccount.execute(
        auth.userId,
        request.body.currentPassword,
    );

    clearRefreshTokenCookie(response);
    response.status(204).send();
}
