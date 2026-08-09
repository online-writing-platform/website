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
} from "../../../middlewares/rate-limit.middleware.js";

import {
    validateBody,
    validateParams,
} from "../../../middlewares/validate.middleware.js";

import {
    changePassword,
    changeUsername,
    confirmEmailChange,
    deleteAccount,
    listSessions,
    login,
    logout,
    refresh,
    register,
    requestEmailChange,
    requestPasswordReset,
    resendVerificationEmail,
    resetPassword,
    revokeOtherSessions,
    revokeSession,
    verifyEmail,
} from "./auth.controller.js";

import { authenticate } from "./auth.middleware.js";

import {
    changePasswordSchema,
    changeUsernameSchema,
    confirmEmailChangeSchema,
    deleteAccountSchema,
    loginSchema,
    registerSchema,
    requestEmailChangeSchema,
    requestPasswordResetSchema,
    resetPasswordSchema,
    sessionParamsSchema,
    verifyEmailSchema,
} from "./auth.schema.js";

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

router.post("/refresh", refreshRateLimiter, refresh);
router.post("/logout", refreshRateLimiter, logout);

router.post(
    "/email-verification/verify",
    emailVerificationRateLimiter,
    validateBody(verifyEmailSchema),
    verifyEmail,
);

router.post(
    "/email-verification/resend",
    verificationEmailResendRateLimiter,
    authenticate,
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
