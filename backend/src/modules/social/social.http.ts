import type { Request, Response } from "express";
import AppError from "../../errors/app-error.js";
import { getValidatedQuery } from "../../middlewares/validate.middleware.js";
import { socialServices } from "./social.service.js";
import type { SocialListQuery, SocialUsernameParams } from "./social.schema.js";
import { Router } from "express";
import { socialWriteRateLimiter } from "../../middlewares/rate-limit.middleware.js";
import { validateParams, validateQuery } from "../../middlewares/validate.middleware.js";
import { authenticate, requireVerifiedEmail } from "../auth/auth.middleware.js";
import {
    socialListQuerySchema,
    socialUsernameParamsSchema,
} from "./social.schema.js";

function requireUserId(request: Request): string {
    const userId = request.auth?.userId;
    if (!userId) throw AppError.unauthorized();
    return userId;
}

export async function followUser(
    request: Request<SocialUsernameParams>,
    response: Response,
): Promise<void> {
    await socialServices.service.follow(requireUserId(request), request.params.username);
    response.status(204).send();
}

export async function unfollowUser(
    request: Request<SocialUsernameParams>,
    response: Response,
): Promise<void> {
    await socialServices.service.unfollow(requireUserId(request), request.params.username);
    response.status(204).send();
}

export async function blockUser(
    request: Request<SocialUsernameParams>,
    response: Response,
): Promise<void> {
    await socialServices.service.block(requireUserId(request), request.params.username);
    response.status(204).send();
}

export async function unblockUser(
    request: Request<SocialUsernameParams>,
    response: Response,
): Promise<void> {
    await socialServices.service.unblock(requireUserId(request), request.params.username);
    response.status(204).send();
}

export async function muteUser(
    request: Request<SocialUsernameParams>,
    response: Response,
): Promise<void> {
    await socialServices.service.mute(requireUserId(request), request.params.username);
    response.status(204).send();
}

export async function unmuteUser(
    request: Request<SocialUsernameParams>,
    response: Response,
): Promise<void> {
    await socialServices.service.unmute(requireUserId(request), request.params.username);
    response.status(204).send();
}

export async function getRelationship(
    request: Request<SocialUsernameParams>,
    response: Response,
): Promise<void> {
    const data = await socialServices.service.relationship(
        requireUserId(request),
        request.params.username,
    );
    response.status(200).json({ data });
}

export async function getFollowers(
    request: Request<SocialUsernameParams>,
    response: Response,
): Promise<void> {
    const query = getValidatedQuery<SocialListQuery>(request);
    const data = await socialServices.service.listFollowers(
        request.params.username,
        query.cursor,
        query.limit,
    );
    response.status(200).json({ data });
}

export async function getFollowing(
    request: Request<SocialUsernameParams>,
    response: Response,
): Promise<void> {
    const query = getValidatedQuery<SocialListQuery>(request);
    const data = await socialServices.service.listFollowing(
        request.params.username,
        query.cursor,
        query.limit,
    );
    response.status(200).json({ data });
}

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
