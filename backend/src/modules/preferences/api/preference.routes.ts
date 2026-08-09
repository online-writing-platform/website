import { Router } from "express";

import { sensitiveAccountRateLimiter } from "../../../middlewares/rate-limit.middleware.js";
import { validateBody } from "../../../middlewares/validate.middleware.js";
import { authenticate } from "../../auth/index.js";

import { getPreferences, updatePreferences } from "./preference.controller.js";
import { updatePreferencesSchema } from "./preference.schema.js";

const router = Router();

router.use(authenticate);
router.get("/", getPreferences);
router.patch(
    "/",
    sensitiveAccountRateLimiter,
    validateBody(updatePreferencesSchema),
    updatePreferences,
);

export default router;
