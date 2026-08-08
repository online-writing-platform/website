import { Router } from "express";

import {
    loginRateLimiter,
    refreshRateLimiter,
    registrationRateLimiter,
} from "../../middlewares/rate-limit.middleware.js";

import { validateBody } from "../../middlewares/validate.middleware.js";

import { login, logout, refresh, register } from "./auth.controller.js";

import { loginSchema, registerSchema } from "./auth.schema.js";

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

export default router;
