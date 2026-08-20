import type { Request, Response } from "express";

import { Router } from "express";

import { checkDatabaseConnection } from "./db/index.js";
import { checkRedisConnection } from "./infrastructure/redis/redis.js";

const router = Router();

router.get(
    "/live",

    (_request: Request, response: Response): void => {
        response.status(200).json({
            data: {
                status: "ok",

                service: "backend",

                timestamp: new Date().toISOString(),
            },
        });
    },
);

router.get(
    "/ready",

    async (_request: Request, response: Response): Promise<void> => {
        try {
        await checkDatabaseConnection();
        const redisReady = await checkRedisConnection();
        if (!redisReady) throw new Error("A required dependency is unavailable.");

        response.status(200).json({
            data: {
                status: "ready",
            },
        });
        } catch (_error) {
            response.status(503).json({
                error: {
                    code: "NOT_READY",
                    message: "A required dependency is unavailable.",
                    requestId: typeof _request.id === "string" ? _request.id : "health",
                },
            });
        }
    },
);

export default router;
