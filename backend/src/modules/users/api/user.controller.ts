import type { Request, Response } from "express";

import AppError from "../../../errors/app-error.js";

import { userModule } from "../user.module.js";
import type { UpdateProfileInput, UsernameParams } from "./user.schema.js";

function requireUserId(request: Request): string {
    const userId = request.auth?.userId;

    if (!userId) {
        throw AppError.unauthorized();
    }

    return userId;
}

export async function getMe(
    request: Request,
    response: Response,
): Promise<void> {
    const user = await userModule.profile.getMe(requireUserId(request));

    response.status(200).json({ data: { user } });
}

export async function updateMe(
    request: Request<Record<string, never>, unknown, UpdateProfileInput>,
    response: Response,
): Promise<void> {
    const user = await userModule.profile.updateMe(
        requireUserId(request),
        request.body,
    );

    response.status(200).json({ data: { user } });
}

export async function getProfileByUsername(
    request: Request<UsernameParams>,
    response: Response,
): Promise<void> {
    const user = await userModule.profile.getPublic(request.params.username);

    response.status(200).json({ data: { user } });
}
