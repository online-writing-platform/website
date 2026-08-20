import type { Request, Response } from "express";
import { getValidatedQuery } from "../../../middlewares/validate.middleware.js";
import { discoveryServices } from "../discovery.service.js";
import type { SearchQuery } from "./search.schema.js";
import { Router } from "express";
import { validateQuery } from "../../../middlewares/validate.middleware.js";
import { searchRateLimiter } from "../../../middlewares/rate-limit.middleware.js";
import { optionalAuthenticate } from "../../auth/auth.middleware.js";
import { searchQuerySchema } from "./search.schema.js";

export async function search(
    request: Request,
    response: Response,
): Promise<void> {
    const query = getValidatedQuery<SearchQuery>(request);

    const data = await discoveryServices.search.search(
        query.q,
        query.type,
        query.limit,
        query.page,
        request.auth?.userId,
    );

    response.status(200).json({ data });
}

const router = Router();

router.get(
    "/",
    searchRateLimiter,
    optionalAuthenticate,
    validateQuery(searchQuerySchema),
    search,
);

export default router;
