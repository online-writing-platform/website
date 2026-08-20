import type { Request, Response } from "express";
import { discoveryServices } from "./discovery.service.js";
import { Router } from "express";
import { optionalAuthenticate } from "../auth/auth.middleware.js";

export async function getDiscoveryHome(
    request: Request,
    response: Response,
): Promise<void> {
    const data = await discoveryServices.service.home(request.auth?.userId);
    response.status(200).json({ data });
}

const router = Router();

router.get("/home", optionalAuthenticate, getDiscoveryHome);

export default router;
