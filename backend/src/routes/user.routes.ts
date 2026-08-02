import { Router } from "express";

import {
    getMe,
    getProfileByUsername,
    updateMe,
} from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
    validateBody,
    validateParams,
} from "../middlewares/validate.middleware.js";
import {
    updateProfileSchema,
    usernameParamsSchema,
} from "../validators/user.validator.js";

const router = Router();

router.get("/me", authenticate, getMe);

router.patch("/me", authenticate, validateBody(updateProfileSchema), updateMe);

router.get(
    "/:username",
    validateParams(usernameParamsSchema),
    getProfileByUsername,
);

export default router;
