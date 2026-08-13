import { Router } from "express";

import { validateQuery } from "../../../middlewares/validate.middleware.js";
import { searchRateLimiter } from "../../../middlewares/rate-limit.middleware.js";
import { optionalAuthenticate } from "../../auth/index.js";
import { search } from "./search.controller.js";
import { searchQuerySchema } from "./search.schema.js";

const router = Router();

router.get(
    "/",
    searchRateLimiter,
    optionalAuthenticate,
    validateQuery(searchQuerySchema),
    search,
);

export default router;
