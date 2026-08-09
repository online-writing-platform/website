import type { Request, Response } from "express";

import AppError from "../../../errors/app-error.js";
import { getValidatedQuery } from "../../../middlewares/validate.middleware.js";
import { socialModule } from "../social.module.js";
import type { SocialListQuery, SocialUsernameParams } from "./social.schema.js";

function requireUserId(request: Request): string {
    const userId = request.auth?.userId;
    if (!userId) throw AppError.unauthorized();
    return userId;
}

export async function followUser(
    request: Request<SocialUsernameParams>,
    response: Response,
): Promise<void> {
    await socialModule.service.follow(requireUserId(request), request.params.username);
    response.status(204).send();
}

export async function unfollowUser(
    request: Request<SocialUsernameParams>,
    response: Response,
): Promise<void> {
    await socialModule.service.unfollow(requireUserId(request), request.params.username);
    response.status(204).send();
}

export async function blockUser(
    request: Request<SocialUsernameParams>,
    response: Response,
): Promise<void> {
    await socialModule.service.block(requireUserId(request), request.params.username);
    response.status(204).send();
}

export async function unblockUser(
    request: Request<SocialUsernameParams>,
    response: Response,
): Promise<void> {
    await socialModule.service.unblock(requireUserId(request), request.params.username);
    response.status(204).send();
}

export async function muteUser(
    request: Request<SocialUsernameParams>,
    response: Response,
): Promise<void> {
    await socialModule.service.mute(requireUserId(request), request.params.username);
    response.status(204).send();
}

export async function unmuteUser(
    request: Request<SocialUsernameParams>,
    response: Response,
): Promise<void> {
    await socialModule.service.unmute(requireUserId(request), request.params.username);
    response.status(204).send();
}

export async function getRelationship(
    request: Request<SocialUsernameParams>,
    response: Response,
): Promise<void> {
    const data = await socialModule.service.relationship(
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
    const data = await socialModule.service.listFollowers(
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
    const data = await socialModule.service.listFollowing(
        request.params.username,
        query.cursor,
        query.limit,
    );
    response.status(200).json({ data });
}
