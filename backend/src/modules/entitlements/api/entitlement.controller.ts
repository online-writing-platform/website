import type { Request, Response } from "express";

import AppError from "../../../errors/app-error.js";
import { entitlementModule } from "../entitlement.module.js";

export async function listMyEntitlements(
    request: Request,
    response: Response,
): Promise<void> {
    const userId = request.auth?.userId;
    if (!userId) throw AppError.unauthorized();

    const data = await entitlementModule.service.list(userId);
    response.status(200).json({ data });
}
