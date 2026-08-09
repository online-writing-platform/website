import type { Request, Response } from "express";

import AppError from "../../../errors/app-error.js";
import { preferenceModule } from "../preference.module.js";
import type { UpdatePreferencesBody } from "./preference.schema.js";

function requireUserId(request: Request): string {
    const userId = request.auth?.userId;
    if (!userId) throw AppError.unauthorized();
    return userId;
}

export async function getPreferences(
    request: Request,
    response: Response,
): Promise<void> {
    const preferences = await preferenceModule.service.get(requireUserId(request));
    response.status(200).json({ data: { preferences } });
}

export async function updatePreferences(
    request: Request<Record<string, never>, unknown, UpdatePreferencesBody>,
    response: Response,
): Promise<void> {
    const preferences = await preferenceModule.service.update(
        requireUserId(request),
        request.body,
    );
    response.status(200).json({ data: { preferences } });
}
