import type { Request, Response } from "express";
import AppError from "../../errors/app-error.js";
import { preferenceServices } from "./preference.service.js";
import type { UpdatePreferencesBody } from "./preference.schema.js";
import { Router } from "express";
import { sensitiveAccountRateLimiter } from "../../middlewares/rate-limit.middleware.js";
import { validateBody } from "../../middlewares/validate.middleware.js";
import { authenticate } from "../auth/auth.middleware.js";
import { updatePreferencesSchema } from "./preference.schema.js";

function requireUserId(request: Request): string {
    const userId = request.auth?.userId;
    if (!userId) throw AppError.unauthorized();
    return userId;
}

export async function getPreferences(
    request: Request,
    response: Response,
): Promise<void> {
    const preferences = await preferenceServices.service.get(requireUserId(request));
    response.status(200).json({ data: { preferences } });
}

export async function updatePreferences(
    request: Request<Record<string, never>, unknown, UpdatePreferencesBody>,
    response: Response,
): Promise<void> {
    const preferences = await preferenceServices.service.update(
        requireUserId(request),
        request.body,
    );
    response.status(200).json({ data: { preferences } });
}

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
