import type { Request, Response } from "express";
import AppError from "../../errors/app-error.js";
import { userServices } from "./user.service.js";
import type { UpdateProfileInput, UsernameParams } from "./user.schema.js";
import { Router } from "express";
import { authenticate } from "../auth/auth.middleware.js";
import {
    validateBody,
    validateParams,
} from "../../middlewares/validate.middleware.js";
import { updateProfileSchema, usernameParamsSchema } from "./user.schema.js";

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
    const user = await userServices.profile.getMe(requireUserId(request));

    response.status(200).json({ data: { user } });
}

export async function updateMe(
    request: Request<Record<string, never>, unknown, UpdateProfileInput>,
    response: Response,
): Promise<void> {
    const user = await userServices.profile.updateMe(
        requireUserId(request),
        request.body,
    );

    response.status(200).json({ data: { user } });
}

export async function getProfileByUsername(
    request: Request<UsernameParams>,
    response: Response,
): Promise<void> {
    const user = await userServices.profile.getPublic(request.params.username);

    response.status(200).json({ data: { user } });
}

const router = Router();

router.get("/me", authenticate, getMe);
router.patch("/me", authenticate, validateBody(updateProfileSchema), updateMe);
router.get(
    "/:username",
    validateParams(usernameParamsSchema),
    getProfileByUsername,
);

export default router;
