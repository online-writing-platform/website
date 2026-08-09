import { Router } from "express";

import { socialWriteRateLimiter } from "../../../middlewares/rate-limit.middleware.js";
import { validateParams, validateQuery } from "../../../middlewares/validate.middleware.js";
import { authenticate, requireVerifiedEmail } from "../../auth/index.js";
import {
    followUser,
    getFollowers,
    getFollowing,
    getRelationship,
    unfollowUser,
} from "./social.controller.js";
import { socialListQuerySchema, socialUsernameParamsSchema } from "./social.schema.js";

const router = Router();

router.get(
    "/:username/followers",
    validateParams(socialUsernameParamsSchema),
    validateQuery(socialListQuerySchema),
    getFollowers,
);
router.get(
    "/:username/following",
    validateParams(socialUsernameParamsSchema),
    validateQuery(socialListQuerySchema),
    getFollowing,
);
router.get(
    "/:username/relationship",
    authenticate,
    validateParams(socialUsernameParamsSchema),
    getRelationship,
);
router.post(
    "/:username/follow",
    socialWriteRateLimiter,
    authenticate,
    requireVerifiedEmail,
    validateParams(socialUsernameParamsSchema),
    followUser,
);
router.delete(
    "/:username/follow",
    socialWriteRateLimiter,
    authenticate,
    requireVerifiedEmail,
    validateParams(socialUsernameParamsSchema),
    unfollowUser,
);

export default router;
