import { Router } from "express";

import {
    emailVerificationRateLimiter,
    loginRateLimiter,
    refreshRateLimiter,
    registrationRateLimiter,
    verificationEmailResendRateLimiter,
} from "../../middlewares/rate-limit.middleware.js";

import { validateBody } from "../../middlewares/validate.middleware.js";

import {
    login,
    logout,
    refresh,
    register,
    resendVerificationEmail,
    verifyEmail,
} from "./auth.controller.js";

import { authenticate } from "./auth.middleware.js";

import {
    loginSchema,
    registerSchema,
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

router.post(
    "/refresh",

    refreshRateLimiter,

    refresh,
);

router.post(
    "/logout",

    refreshRateLimiter,

    logout,
);

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

export default router;
