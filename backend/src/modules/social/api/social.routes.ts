import { Router } from "express";

import { socialWriteRateLimiter } from "../../../middlewares/rate-limit.middleware.js";
import { validateParams, validateQuery } from "../../../middlewares/validate.middleware.js";
import { authenticate, requireVerifiedEmail } from "../../auth/index.js";
import {
    blockUser,
    followUser,
    getFollowers,
    getFollowing,
    getRelationship,
    muteUser,
    unblockUser,
    unfollowUser,
    unmuteUser,
} from "./social.controller.js";
import {
    socialListQuerySchema,
    socialUsernameParamsSchema,
} from "./social.schema.js";

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

for (const [path, handler] of [
    ["/:username/follow", followUser],
    ["/:username/block", blockUser],
    ["/:username/mute", muteUser],
] as const) {
    router.post(
        path,
        socialWriteRateLimiter,
        authenticate,
        requireVerifiedEmail,
        validateParams(socialUsernameParamsSchema),
        handler,
    );
}

for (const [path, handler] of [
    ["/:username/follow", unfollowUser],
    ["/:username/block", unblockUser],
    ["/:username/mute", unmuteUser],
] as const) {
    router.delete(
        path,
        socialWriteRateLimiter,
        authenticate,
        requireVerifiedEmail,
        validateParams(socialUsernameParamsSchema),
        handler,
    );
}

export default router;
