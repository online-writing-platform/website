import type { Request, Response } from "express";

import { discoveryModule } from "../discovery.module.js";

export async function getDiscoveryHome(
    request: Request,
    response: Response,
): Promise<void> {
    const data = await discoveryModule.service.home(request.auth?.userId);
    response.status(200).json({ data });
}
