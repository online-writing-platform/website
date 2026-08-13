import { Router } from "express";

import { validateQuery } from "../../../middlewares/validate.middleware.js";
import { authenticate } from "../../auth/index.js";
import { getFeed } from "./feed.controller.js";
import { feedQuerySchema } from "./feed.schema.js";

const router = Router();
router.get("/", authenticate, validateQuery(feedQuerySchema), getFeed);
export default router;
