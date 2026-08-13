import type { Request, Response } from "express";

import { getValidatedQuery } from "../../../middlewares/validate.middleware.js";
import { discoveryModule } from "../discovery.module.js";
import type { SearchQuery } from "./search.schema.js";

export async function search(
    request: Request,
    response: Response,
): Promise<void> {
    const query = getValidatedQuery<SearchQuery>(request);

    const data = await discoveryModule.search.search(
        query.q,
        query.type,
        query.limit,
        query.page,
        request.auth?.userId,
    );

    response.status(200).json({ data });
}
