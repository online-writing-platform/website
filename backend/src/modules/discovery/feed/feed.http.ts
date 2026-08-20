import type { Request, Response } from "express";
import AppError from "../../../errors/app-error.js";
import { getValidatedQuery } from "../../../middlewares/validate.middleware.js";
import { feedServices } from "./feed.service.js";
import type { FeedQuery } from "./feed.schema.js";
import { Router } from "express";
import { validateQuery } from "../../../middlewares/validate.middleware.js";
import { authenticate } from "../../auth/auth.middleware.js";
import { feedQuerySchema } from "./feed.schema.js";

export async function getFeed(
    request: Request,
    response: Response,
): Promise<void> {
    const userId = request.auth?.userId;

    if (!userId) {
        throw AppError.unauthorized();
    }

    const query = getValidatedQuery<FeedQuery>(request);

    const data = await feedServices.service.list(
        userId,
        query.cursor,
        query.limit,
    );

    response.status(200).json({ data });
}

const router = Router();
router.get("/", authenticate, validateQuery(feedQuerySchema), getFeed);
export default router;
