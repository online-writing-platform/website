import type { Request, Response } from "express";
import AppError from "../../errors/app-error.js";
import { authService } from "./auth.service.js";
import { sessionService } from "./session.service.js";
import { accountService } from "./account.service.js";
import { passwordService } from "./password.service.js";
import type { ClientInformation } from "./auth.types.js";
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
    ResendVerificationEmailInput,
    RequestEmailChangeInput,
    RequestPasswordResetInput,
    ResetPasswordInput,
    SessionParams,
    VerifyEmailInput,
} from "./auth.schema.js";
import { Router } from "express";
import {
    emailVerificationRateLimiter,
    loginRateLimiter,
    passwordResetConfirmRateLimiter,
    passwordResetRequestRateLimiter,
    refreshRateLimiter,
    registrationRateLimiter,
    sensitiveAccountRateLimiter,
    verificationEmailResendRateLimiter,
} from "../../middlewares/rate-limit.middleware.js";
import {
    validateBody,
    validateParams,
} from "../../middlewares/validate.middleware.js";
import { authenticate } from "./auth.middleware.js";
import { requireTrustedOrigin } from "../../shared/http/origin-policy.js";
import {
    changePasswordSchema,
    changeUsernameSchema,
    confirmEmailChangeSchema,
    deleteAccountSchema,
    loginSchema,
    registerSchema,
    resendVerificationEmailSchema,
    requestEmailChangeSchema,
    requestPasswordResetSchema,
    resetPasswordSchema,
    sessionParamsSchema,
    verifyEmailSchema,
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
    const result = await authService.register(request.body);

    response.status(201).json({
        data: result,
    });
}

export async function login(
    request: Request<Record<string, never>, unknown, LoginInput>,
    response: Response,
): Promise<void> {
    const result = await authService.login(
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

    const result = await sessionService.refresh(refreshToken);

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
    await sessionService.logout(getRefreshTokenCookie(request));
    clearRefreshTokenCookie(response);
    response.status(204).send();
}

export async function verifyEmail(
    request: Request<Record<string, never>, unknown, VerifyEmailInput>,
    response: Response,
): Promise<void> {
    const result = await authService.verifyEmail(
        request.body.email,
        request.body.code,
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

export async function resendVerificationEmail(
    request: Request<
        Record<string, never>,
        unknown,
        ResendVerificationEmailInput
    >,
    response: Response,
): Promise<void> {
    await authService.resendVerificationEmail(request.body.email);

    response.status(202).json({
        data: { status: "sent" },
    });
}

export async function requestPasswordReset(
    request: Request<Record<string, never>, unknown, RequestPasswordResetInput>,
    response: Response,
): Promise<void> {
    await passwordService.requestReset(request.body.identifier);

    response.status(202).json({
        data: { status: "accepted" },
    });
}

export async function resetPassword(
    request: Request<Record<string, never>, unknown, ResetPasswordInput>,
    response: Response,
): Promise<void> {
    await passwordService.reset(
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

    await passwordService.change(
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

    await accountService.changeUsername(
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

    await accountService.requestEmailChange(
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
    await accountService.confirmEmailChange(request.body.token);

    clearRefreshTokenCookie(response);
    response.status(204).send();
}

export async function listSessions(
    request: Request,
    response: Response,
): Promise<void> {
    const auth = requireAuth(request);
    const sessions = await sessionService.list(
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

    await sessionService.revoke(auth.userId, request.params.sessionId);

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
    const revokedCount = await sessionService.revokeOthers(
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

    await accountService.deleteAccount(
        auth.userId,
        request.body.currentPassword,
    );

    clearRefreshTokenCookie(response);
    response.status(204).send();
}

const router = Router();

router.use((_request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    next();
});

router.post(
    "/register",
    registrationRateLimiter,
    validateBody(registerSchema),
    register,
);

router.post(
    "/login",
    loginRateLimiter,
    validateBody(loginSchema),
    login,
);

router.post("/refresh", refreshRateLimiter, requireTrustedOrigin, refresh);
router.post("/logout", refreshRateLimiter, requireTrustedOrigin, logout);

router.post(
    "/email-verification/verify",
    emailVerificationRateLimiter,
    validateBody(verifyEmailSchema),
    verifyEmail,
);

router.post(
    "/email-verification/resend",
    verificationEmailResendRateLimiter,
    validateBody(resendVerificationEmailSchema),
    resendVerificationEmail,
);

router.post(
    "/password-reset/request",
    passwordResetRequestRateLimiter,
    validateBody(requestPasswordResetSchema),
    requestPasswordReset,
);

router.post(
    "/password-reset/confirm",
    passwordResetConfirmRateLimiter,
    validateBody(resetPasswordSchema),
    resetPassword,
);

router.patch(
    "/password",
    sensitiveAccountRateLimiter,
    authenticate,
    validateBody(changePasswordSchema),
    changePassword,
);

router.patch(
    "/username",
    sensitiveAccountRateLimiter,
    authenticate,
    validateBody(changeUsernameSchema),
    changeUsername,
);

router.post(
    "/email-change/request",
    sensitiveAccountRateLimiter,
    authenticate,
    validateBody(requestEmailChangeSchema),
    requestEmailChange,
);

router.post(
    "/email-change/confirm",
    sensitiveAccountRateLimiter,
    validateBody(confirmEmailChangeSchema),
    confirmEmailChange,
);

router.get("/sessions", authenticate, listSessions);

router.delete(
    "/sessions/:sessionId",
    sensitiveAccountRateLimiter,
    authenticate,
    validateParams(sessionParamsSchema),
    revokeSession,
);

router.post(
    "/sessions/revoke-others",
    sensitiveAccountRateLimiter,
    authenticate,
    revokeOtherSessions,
);

router.delete(
    "/account",
    sensitiveAccountRateLimiter,
    authenticate,
    validateBody(deleteAccountSchema),
    deleteAccount,
);

export default router;
