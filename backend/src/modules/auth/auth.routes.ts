import { Router } from "express";

import {
    login,
    logout,
    refresh,
    register,
} from "../controllers/auth.controller.js";
import {
    loginRateLimiter,
    refreshRateLimiter,
    registrationRateLimiter,
} from "../middlewares/rate-limit.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { loginSchema, registerSchema } from "../validators/auth.validator.js";

const router = Router();

router.post(
    "/register",
    registrationRateLimiter,
    validateBody(registerSchema),
    register,
);

router.post("/login", loginRateLimiter, validateBody(loginSchema), login);

router.post("/refresh", refreshRateLimiter, refresh);

router.post("/logout", refreshRateLimiter, logout);

export default router;
