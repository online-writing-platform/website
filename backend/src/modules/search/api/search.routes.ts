import { Router } from "express";

import { validateQuery } from "../../../middlewares/validate.middleware.js";
import { optionalAuthenticate } from "../../auth/index.js";
import { search } from "./search.controller.js";
import { searchQuerySchema } from "./search.schema.js";

const router = Router();

router.get(
    "/",
    optionalAuthenticate,
    validateQuery(searchQuerySchema),
    search,
);

export default router;
