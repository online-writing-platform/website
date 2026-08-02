import type { NextFunction, Request, Response } from "express";
import { Router } from "express";

import { checkDatabaseConnection } from "../db/index.js";

const router = Router();

router.get("/live", (_request: Request, response: Response): void => {
    response.status(200).json({
        data: {
            status: "ok",
            service: "backend",
            timestamp: new Date().toISOString(),
        },
    });
});

router.get(
    "/ready",
    async (
        _request: Request,
        response: Response,
        next: NextFunction,
    ): Promise<void> => {
        try {
            const databaseTime = await checkDatabaseConnection();

            response.status(200).json({
                data: {
                    status: "ready",
                    service: "backend",
                    databaseTime: databaseTime.toISOString(),
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (error) {
            next(error);
        }
    },
);

export default router;
