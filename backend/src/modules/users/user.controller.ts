import type { Request, Response } from "express";

import AppError from "../../errors/app-error.js";

import {
    getMyProfile,
    getPublicProfile,
    updateMyProfile,
} from "./user.service.js";

import type { UpdateProfileInput, UsernameParams } from "./user.schema.js";

function getAuthenticatedUserId(request: Request): string {
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
    const user = await getMyProfile(getAuthenticatedUserId(request));

    response.status(200).json({
        data: {
            user,
        },
    });
}

export async function updateMe(
    request: Request<Record<string, never>, unknown, UpdateProfileInput>,
    response: Response,
): Promise<void> {
    const user = await updateMyProfile(
        getAuthenticatedUserId(request),

        request.body,
    );

    response.status(200).json({
        data: {
            user,
        },
    });
}

export async function getProfileByUsername(
    request: Request<UsernameParams>,
    response: Response,
): Promise<void> {
    const user = await getPublicProfile(request.params.username);

    response.status(200).json({
        data: {
            user,
        },
    });
}
