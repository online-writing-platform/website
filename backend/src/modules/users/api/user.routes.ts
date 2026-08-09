import { Router } from "express";

import { authenticate } from "../../auth/index.js";
import {
    validateBody,
    validateParams,
} from "../../../middlewares/validate.middleware.js";

import { getMe, getProfileByUsername, updateMe } from "./user.controller.js";
import { updateProfileSchema, usernameParamsSchema } from "./user.schema.js";

const router = Router();

router.get("/me", authenticate, getMe);
router.patch("/me", authenticate, validateBody(updateProfileSchema), updateMe);
router.get(
    "/:username",
    validateParams(usernameParamsSchema),
    getProfileByUsername,
);

export default router;
